"""
A small, self-contained DEX (version 035) writer — just enough to emit the two
classes the GK Fitness Android shell needs (a WebView activity and a
text-to-speech bridge). No Android SDK is required.

Instructions are written as tuples and encoded after every string/type/proto/
field/method has been sorted and indexed, exactly as the DEX spec requires.
"""
import hashlib
import struct
import zlib

NO_INDEX = 0xFFFFFFFF


def uleb(n):
    out = bytearray()
    while True:
        b = n & 0x7F
        n >>= 7
        if n:
            out.append(b | 0x80)
        else:
            out.append(b)
            return bytes(out)


def mutf8(s):
    out = bytearray()
    for ch in s:
        c = ord(ch)
        if c == 0:
            out += b'\xc0\x80'
        elif c < 0x80:
            out.append(c)
        elif c < 0x800:
            out += bytes([0xC0 | (c >> 6), 0x80 | (c & 0x3F)])
        else:
            out += bytes([0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F)])
    return bytes(out)


SHORTY = {'V': 'V', 'Z': 'Z', 'B': 'B', 'S': 'S', 'C': 'C', 'I': 'I', 'J': 'J', 'F': 'F', 'D': 'D'}


def shorty_of(ret, params):
    s = lambda t: 'L' if t[0] in 'L[' else t
    return s(ret) + ''.join(s(p) for p in params)


class Method:
    def __init__(self, cls, name, ret, params, flags, regs, ins, outs, code, annotate=False):
        self.cls, self.name, self.ret, self.params = cls, name, ret, tuple(params)
        self.flags, self.regs, self.ins, self.outs, self.code = flags, regs, ins, outs, code
        self.annotate = annotate


class Class:
    def __init__(self, name, sup, flags=0x1):
        self.name, self.sup, self.flags = name, sup, flags
        self.fields = []     # (name, type, flags)
        self.methods = []    # Method


# ---- instruction helpers ---------------------------------------------------
# operands that are references: ('m', cls, name, ret, params) | ('f', cls, name, type)
#                               ('t', type) | ('s', string)

def M(cls, name, ret, *params):
    return ('m', cls, name, ret, tuple(params))


def F(cls, name, typ):
    return ('f', cls, name, typ)


class Dex:
    def __init__(self):
        self.classes = []

    def add(self, c):
        self.classes.append(c)
        return c

    # collect every reference used so that ids can be sorted
    def _collect(self):
        strings, types, protos, fields, methods = set(), set(), set(), set(), set()

        def t(x):
            types.add(x)
            strings.add(x)

        def p(ret, params):
            t(ret)
            for q in params:
                t(q)
            strings.add(shorty_of(ret, params))
            protos.add((ret, tuple(params)))

        def ref(r):
            k = r[0]
            if k == 'm':
                _, c, n, ret, params = r
                t(c); strings.add(n); p(ret, params)
                methods.add((c, n, ret, tuple(params)))
            elif k == 'f':
                _, c, n, ty = r
                t(c); strings.add(n); t(ty)
                fields.add((c, n, ty))
            elif k == 't':
                t(r[1])
            elif k == 's':
                strings.add(r[1])

        for c in self.classes:
            t(c.name); t(c.sup)
            for (n, ty, _) in c.fields:
                ref(('f', c.name, n, ty))
            for m in c.methods:
                ref(('m', c.name, m.name, m.ret, m.params))
                for ins in m.code:
                    for o in ins[1:]:
                        if isinstance(o, tuple):
                            ref(o)
        return strings, types, protos, fields, methods

    def build(self, annotation_type=None):
        strings, types, protos, fields, methods = self._collect()
        if annotation_type:
            types.add(annotation_type); strings.add(annotation_type)

        # MUTF-8 strings sort by UTF-16 code units; plain ASCII here, so byte order works
        S = sorted(strings, key=lambda s: [ord(ch) for ch in s])
        si = {s: i for i, s in enumerate(S)}
        T = sorted(types, key=lambda x: si[x])
        ti = {x: i for i, x in enumerate(T)}
        P = sorted(protos, key=lambda pr: (ti[pr[0]], [ti[q] for q in pr[1]]))
        pi = {pr: i for i, pr in enumerate(P)}
        Fl = sorted(fields, key=lambda f: (ti[f[0]], si[f[1]], ti[f[2]]))
        fi = {f: i for i, f in enumerate(Fl)}
        Ml = sorted(methods, key=lambda m: (ti[m[0]], si[m[1]], pi[(m[2], m[3])]))
        mi = {m: i for i, m in enumerate(Ml)}

        def idx(r):
            k = r[0]
            if k == 'm':
                return mi[(r[1], r[2], r[3], r[4])]
            if k == 'f':
                return fi[(r[1], r[2], r[3])]
            if k == 't':
                return ti[r[1]]
            if k == 's':
                return si[r[1]]
            raise ValueError(r)

        # ---- encode instructions --------------------------------------
        def enc(code):
            words = []
            labels, fix = {}, []
            for ins in code:
                op = ins[0]
                if op == 'label':
                    labels[ins[1]] = len(words)
                    continue
                if op in ('invoke-virtual', 'invoke-super', 'invoke-direct', 'invoke-static', 'invoke-interface'):
                    opc = {'invoke-virtual': 0x6E, 'invoke-super': 0x6F, 'invoke-direct': 0x70,
                           'invoke-static': 0x71, 'invoke-interface': 0x72}[op]
                    ref, regs = ins[1], list(ins[2])
                    assert len(regs) <= 5 and all(r < 16 for r in regs)
                    a = len(regs)
                    rr = regs + [0] * (5 - a)
                    words += [opc | (a << 12) | (rr[4] << 8), idx(ref),
                              rr[0] | (rr[1] << 4) | (rr[2] << 8) | (rr[3] << 12)]
                elif op == 'return-void':
                    words.append(0x0E)
                elif op == 'const/4':
                    r, v = ins[1], ins[2]
                    assert r < 16 and -8 <= v <= 7
                    words.append(0x12 | (r << 8) | ((v & 0xF) << 12))
                elif op == 'const/16':
                    words += [0x13 | (ins[1] << 8), ins[2] & 0xFFFF]
                elif op == 'const-string':
                    words += [0x1A | (ins[1] << 8), idx(ins[2])]
                elif op == 'new-instance':
                    words += [0x22 | (ins[1] << 8), idx(ins[2])]
                elif op in ('iget-object', 'iput-object'):
                    opc = 0x54 if op == 'iget-object' else 0x5B
                    a, b, ref = ins[1], ins[2], ins[3]
                    words += [opc | (a << 8) | (b << 12), idx(ref)]
                elif op == 'move-result':
                    words.append(0x0A | (ins[1] << 8))
                elif op == 'move-result-object':
                    words.append(0x0C | (ins[1] << 8))
                elif op in ('if-eqz', 'if-nez'):
                    opc = 0x38 if op == 'if-eqz' else 0x39
                    fix.append((len(words), ins[2]))
                    words += [opc | (ins[1] << 8), 0]
                else:
                    raise ValueError(op)
            for at, lab in fix:
                words[at + 1] = (labels[lab] - at) & 0xFFFF
            return words

        # ---- layout ----------------------------------------------------
        HDR = 0x70
        off = HDR
        string_ids_off = off; off += 4 * len(S)
        type_ids_off = off; off += 4 * len(T)
        proto_ids_off = off; off += 12 * len(P)
        field_ids_off = off; off += 8 * len(Fl)
        method_ids_off = off; off += 8 * len(Ml)
        class_defs_off = off; off += 32 * len(self.classes)
        data_off = off

        data = bytearray()
        mapitems = []  # (type, count, offset)

        def align4():
            while (data_off + len(data)) % 4:
                data.append(0)

        def here():
            return data_off + len(data)

        # code items
        align4()
        code_off = {}
        start = here(); n = 0
        for c in self.classes:
            for m in c.methods:
                align4()
                code_off[id(m)] = here()
                w = enc(m.code)
                data.extend(struct.pack('<HHHHII', m.regs, m.ins, m.outs, 0, 0, len(w)))
                for x in w:
                    data.extend(struct.pack('<H', x))
                n += 1
        mapitems.append((0x2001, n, start))

        # annotations: one annotation_item, one set shared by every bridge method
        ann_dir_off = {}
        if annotation_type:
            start = here()
            ann_item_off = here()
            data.extend(bytes([0x01]) + uleb(ti[annotation_type]) + uleb(0))   # RUNTIME, 0 elements
            mapitems.append((0x2004, 1, start))
            align4()
            set_off = here()
            data.extend(struct.pack('<II', 1, ann_item_off))
            mapitems.append((0x1003, 1, set_off))
            align4()
            start = here(); n = 0
            for c in self.classes:
                ann = sorted([mi[(c.name, m.name, m.ret, m.params)] for m in c.methods if m.annotate])
                if not ann:
                    continue
                align4()
                ann_dir_off[c.name] = here()
                data.extend(struct.pack('<IIII', 0, 0, len(ann), 0))
                for k in ann:
                    data.extend(struct.pack('<II', k, set_off))
                n += 1
            mapitems.append((0x2006, n, start))

        # type lists (proto parameters)
        align4()
        tl_off = {}
        start = here(); n = 0
        for pr in P:
            if not pr[1] or pr[1] in tl_off:
                continue
            align4()
            tl_off[pr[1]] = here()
            data.extend(struct.pack('<I', len(pr[1])))
            for q in pr[1]:
                data.extend(struct.pack('<H', ti[q]))
            n += 1
        if n:
            mapitems.append((0x1001, n, start))

        # string data
        str_off = []
        start = here()
        for s in S:
            str_off.append(here())
            data.extend(uleb(len(s)) + mutf8(s) + b'\x00')
        mapitems.append((0x2002, len(S), start))

        # class data
        cd_off = {}
        start = here()
        for c in self.classes:
            cd_off[c.name] = here()
            flds = sorted([(fi[(c.name, n_, ty)], fl) for (n_, ty, fl) in c.fields])
            direct = sorted([(mi[(c.name, m.name, m.ret, m.params)], m) for m in c.methods
                             if m.name in ('<init>', '<clinit>') or m.flags & 0x2 or m.flags & 0x8], key=lambda x: x[0])
            virtual = sorted([(mi[(c.name, m.name, m.ret, m.params)], m) for m in c.methods
                              if not (m.name in ('<init>', '<clinit>') or m.flags & 0x2 or m.flags & 0x8)], key=lambda x: x[0])
            b = bytearray(uleb(0) + uleb(len(flds)) + uleb(len(direct)) + uleb(len(virtual)))
            prev = 0
            for k, fl in flds:
                b += uleb(k - prev) + uleb(fl); prev = k
            for group in (direct, virtual):
                prev = 0
                for k, m in group:
                    b += uleb(k - prev) + uleb(m.flags) + uleb(code_off[id(m)]); prev = k
            data.extend(b)
        mapitems.append((0x2000, len(self.classes), start))

        # map list
        align4()
        map_off = here()
        items = [(0x0000, 1, 0), (0x0001, len(S), string_ids_off), (0x0002, len(T), type_ids_off),
                 (0x0003, len(P), proto_ids_off), (0x0004, len(Fl), field_ids_off),
                 (0x0005, len(Ml), method_ids_off), (0x0006, len(self.classes), class_defs_off)]
        items = [i for i in items if i[1]] + sorted(mapitems, key=lambda x: x[2]) + [(0x1000, 1, map_off)]
        data.extend(struct.pack('<I', len(items)))
        for ty, cnt, o in items:
            data.extend(struct.pack('<HHII', ty, 0, cnt, o))
        align4()

        # ---- ids --------------------------------------------------------
        ids = bytearray()
        for o in str_off:
            ids += struct.pack('<I', o)
        for x in T:
            ids += struct.pack('<I', si[x])
        for pr in P:
            ids += struct.pack('<III', si[shorty_of(pr[0], pr[1])], ti[pr[0]], tl_off.get(pr[1], 0) if pr[1] else 0)
        for f in Fl:
            ids += struct.pack('<HHI', ti[f[0]], ti[f[2]], si[f[1]])
        for m in Ml:
            ids += struct.pack('<HHI', ti[m[0]], pi[(m[2], m[3])], si[m[1]])
        for c in self.classes:
            ids += struct.pack('<IIIIIIII', ti[c.name], c.flags, ti[c.sup], 0, NO_INDEX,
                               ann_dir_off.get(c.name, 0), cd_off[c.name], 0)
        assert HDR + len(ids) == data_off

        file_size = data_off + len(data)
        hdr = bytearray(b'dex\n035\x00' + b'\x00' * 24)
        hdr += struct.pack('<IIIIII', file_size, HDR, 0x12345678, 0, 0, map_off)
        hdr += struct.pack('<II', len(S), string_ids_off)
        hdr += struct.pack('<II', len(T), type_ids_off)
        hdr += struct.pack('<II', len(P), proto_ids_off)
        hdr += struct.pack('<II', len(Fl), field_ids_off)
        hdr += struct.pack('<II', len(Ml), method_ids_off)
        hdr += struct.pack('<II', len(self.classes), class_defs_off)
        hdr += struct.pack('<II', len(data), data_off)
        assert len(hdr) == HDR
        out = bytearray(hdr + ids + data)
        out[12:32] = hashlib.sha1(out[32:]).digest()
        out[8:12] = struct.pack('<I', zlib.adler32(bytes(out[12:])) & 0xFFFFFFFF)
        return bytes(out)
