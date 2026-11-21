import * as React from "react"

export interface SkyMixState {
  a: number
  b: number
  ptr: [number, number]
  ptrOn: number
  dirty: boolean
}

const VERT = "attribute vec2 aPos;void main(){gl_Position=vec4(aPos,0.0,1.0);}"

const FRAG = `precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uMix;
uniform vec2 uPtr;
uniform float uPtrOn;
uniform vec3 uAccent;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){ float v = 0.0; float a = 0.5; for (int i = 0; i < 4; i++){ v += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; } return v; }
vec3 spectrum(float x){ return 0.5 + 0.5 * cos(6.28318 * (x + vec3(0.0, 0.33, 0.67))); }

vec3 mosaic(vec2 frag){
  float cell = max(uRes.y / 30.0, 9.0);
  vec2 id = floor(frag / cell);
  vec2 f = fract(frag / cell);
  vec2 p = (id + 0.5) * cell / uRes.y;
  float ax = uRes.x / uRes.y;
  float t = uTime * 0.07;
  vec2 l1 = vec2(ax * 0.5 + 0.38 * sin(t * 2.1), 0.56 + 0.14 * cos(t * 1.7));
  vec2 l2 = vec2(ax * 0.5 - 0.55 * cos(t * 1.3), 0.2 + 0.1 * sin(t * 2.3));
  vec2 l3 = vec2(ax * 0.5 + 0.62 * cos(t * 0.9 + 2.0), 0.86 + 0.08 * sin(t * 1.1));
  float L = 0.62 * exp(-2.6 * dot(p - l1, p - l1)) + 0.42 * exp(-3.8 * dot(p - l2, p - l2)) + 0.3 * exp(-5.0 * dot(p - l3, p - l3));
  L += uPtrOn * 0.5 * exp(-14.0 * dot(p - uPtr, p - uPtr));
  float n = fbm(p * 3.0 + vec2(t * 1.6, -t * 1.1));
  L *= 0.45 + n;
  float h = hash(id);
  L *= 0.8 + 0.28 * sin(uTime * (0.5 + h * 1.4) + h * 40.0);
  L = clamp(L, 0.0, 1.0);
  L = floor(L * 8.0 + h * 0.6) / 8.0;
  vec2 q = abs(f - 0.5);
  float tile = smoothstep(0.47, 0.41, max(q.x, q.y));
  vec3 cool = vec3(0.60, 0.70, 0.86);
  vec3 warm = vec3(0.96, 0.88, 0.78);
  vec3 col = mix(cool, warm, smoothstep(0.25, 0.75, n)) * L * 0.6;
  col = mix(col, uAccent * L * 0.75, 0.2 * L);
  col *= tile * (0.82 + 0.36 * f.y);
  return col + vec3(0.010, 0.010, 0.014);
}

vec3 prism(vec2 frag){
  vec2 p = frag / uRes.y;
  float t = uTime * 0.05;
  vec3 col = mix(vec3(0.06, 0.08, 0.13), vec3(0.17, 0.22, 0.31), smoothstep(-0.2, 1.3, p.y + p.x * 0.15));
  float d = dot(p, normalize(vec2(1.0, -0.58)));
  float warp = fbm(vec2(d * 1.2 - t, p.y * 0.8 + t)) * 0.7;
  float bands = d * 2.6 + warp - t * 1.6;
  float s = fract(bands);
  float facet = smoothstep(0.0, 0.03, s) * (1.0 - smoothstep(0.03, 0.6, s));
  vec3 spec = spectrum(bands * 0.31 + p.y * 0.25 + t * 0.5);
  float beam = exp(-pow((d - (0.55 + 0.35 * sin(t * 2.0))) * 2.4, 2.0));
  col += spec * facet * (0.09 + 0.3 * beam);
  col += spec * beam * 0.06;
  float glint = pow(max(0.0, 1.0 - abs(s - 0.02) * 30.0), 3.0) * beam;
  col += vec3(0.9, 0.95, 1.0) * glint * 0.22;
  col += uAccent * 0.03;
  return col;
}

vec3 waves(vec2 frag){
  vec2 p = frag / uRes.y;
  float t = uTime * 0.11;
  vec3 col = mix(vec3(0.07, 0.04, 0.08), vec3(0.20, 0.11, 0.19), smoothstep(0.0, 1.1, p.y));
  for (int i = 0; i < 5; i++){
    float fi = float(i);
    float y = 0.52 + (fi - 2.0) * 0.055
      + 0.16 * sin(p.x * (1.5 + fi * 0.3) + t * (1.0 + fi * 0.22) + fi * 1.7)
      + 0.05 * sin(p.x * 3.7 - t * 1.4 + fi * 2.3);
    float dist = abs(p.y - y);
    vec3 c = spectrum(fi * 0.16 + p.x * 0.12 - t * 0.25);
    col += c * (exp(-dist * 42.0) * 0.28 + exp(-dist * 7.0) * 0.05);
  }
  col *= 0.88 + 0.24 * fbm(p * 2.2 + t);
  return col;
}

void main(){
  vec2 frag = gl_FragCoord.xy;
  float m = clamp(uMix, 0.0, 2.0);
  vec3 a; vec3 b = vec3(0.0); float k;
  if (m < 1.0) { k = m; a = mosaic(frag); if (k > 0.001) b = prism(frag); }
  else { k = m - 1.0; a = prism(frag); if (k > 0.001) b = waves(frag); }
  float cell = max(uRes.y / 30.0, 9.0);
  float thr = hash(floor(frag / cell) + 7.0) * 0.65 + (frag.y / uRes.y) * 0.35;
  float w = smoothstep(thr - 0.06, thr + 0.06, k * 1.12 - 0.06);
  vec3 col = mix(a, b, w);
  vec2 uv = frag / uRes;
  float vig = smoothstep(1.25, 0.25, length((uv - 0.5) * vec2(1.0, 1.15)));
  col *= 0.55 + 0.45 * vig;
  col += (hash(frag + fract(uTime)) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}`

export function MosaicSky({
  rootRef,
  mixRef,
  accentGl,
  reduced,
}: {
  rootRef: React.RefObject<HTMLDivElement | null>
  mixRef: React.MutableRefObject<SkyMixState>
  accentGl: [number, number, number]
  reduced: boolean
}) {
  const skyRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const sky = skyRef.current
    const root = rootRef.current
    if (!sky || !root) return

    const canvas = document.createElement("canvas")
    canvas.className = "mpt-canvas"
    sky.prepend(canvas)

    const gl = canvas.getContext("webgl", {
      antialias: false,
      premultipliedAlpha: false,
      powerPreference: "low-power",
    })
    if (!gl) {
      root.dataset.sky = "fallback"
      canvas.remove()
      return
    }

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)
      if (!sh) return null
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        gl.deleteShader(sh)
        return null
      }
      return sh
    }

    const vs = compile(gl.VERTEX_SHADER, VERT)
    const fs = compile(gl.FRAGMENT_SHADER, FRAG)
    const prog = gl.createProgram()
    if (!vs || !fs || !prog) {
      root.dataset.sky = "fallback"
      canvas.remove()
      return
    }

    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      root.dataset.sky = "fallback"
      canvas.remove()
      return
    }

    gl.useProgram(prog)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, "aPos")
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const U = {
      res: gl.getUniformLocation(prog, "uRes"),
      time: gl.getUniformLocation(prog, "uTime"),
      mix: gl.getUniformLocation(prog, "uMix"),
      ptr: gl.getUniformLocation(prog, "uPtr"),
      ptrOn: gl.getUniformLocation(prog, "uPtrOn"),
      accent: gl.getUniformLocation(prog, "uAccent"),
    }
    gl.uniform3f(U.accent, accentGl[0], accentGl[1], accentGl[2])
    root.dataset.sky = "webgl"

    const state = mixRef.current
    let w = 0
    let h = 0
    const size = () => {
      const r = sky.getBoundingClientRect()
      const scale = Math.min(window.devicePixelRatio || 1, 1.5) * 0.75
      w = Math.max(1, Math.round(r.width * scale))
      h = Math.max(1, Math.round(r.height * scale))
      canvas.width = w
      canvas.height = h
      gl.viewport(0, 0, w, h)
      state.dirty = true
    }
    size()
    const ro = new ResizeObserver(size)
    ro.observe(sky)

    let visible = true
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
    })
    io.observe(root)

    const t0 = performance.now()
    let raf = 0
    let ptrOn = 0
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      if (!visible) return
      if (reduced && !state.dirty) return
      state.dirty = false
      ptrOn += (state.ptrOn - ptrOn) * 0.08
      gl.uniform2f(U.res, w, h)
      gl.uniform1f(U.time, reduced ? 12.0 : (now - t0) / 1000)
      gl.uniform1f(U.mix, state.a + state.b)
      gl.uniform2f(U.ptr, state.ptr[0], state.ptr[1])
      gl.uniform1f(U.ptrOn, reduced ? 0 : ptrOn)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    raf = requestAnimationFrame(frame)

    const move = (e: PointerEvent) => {
      const r = sky.getBoundingClientRect()
      state.ptr = [(e.clientX - r.left) / r.height, (r.bottom - e.clientY) / r.height]
      state.ptrOn = 1
    }
    const leave = () => {
      state.ptrOn = 0
    }
    root.addEventListener("pointermove", move)
    root.addEventListener("pointerleave", leave)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      root.removeEventListener("pointermove", move)
      root.removeEventListener("pointerleave", leave)
      gl.deleteBuffer(buf)
      gl.deleteProgram(prog)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.getExtension("WEBGL_lose_context")?.loseContext()
      canvas.remove()
    }
  }, [accentGl, mixRef, reduced, rootRef])

  return (
    <div ref={skyRef} className="mpt-sky" aria-hidden="true">
      <div className="mpt-grain" />
    </div>
  )
}
