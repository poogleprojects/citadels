function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) || "Shader compile error");
  }
  return shader;
}
 
function createProgram(gl, vsSource, fsSource) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) || "Program link error");
  }
  return program;
}
 
export function startWebglBackground(canvas) {
  const gl = canvas.getContext("webgl", { antialias: true });
  if (!gl) return () => {};
 
  const vs = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;
 
  const fs = `
precision mediump float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
 
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
 
void main() {
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
 
  float glow = 0.3 / (length(p - vec2(0.2 * sin(uTime * 0.2), 0.15 * cos(uTime * 0.27))) + 0.45);
  float glow2 = 0.25 / (length(p + vec2(0.25 * cos(uTime * 0.18), 0.1 * sin(uTime * 0.22))) + 0.55);
 
  vec3 deep = vec3(0.04, 0.07, 0.18);
  vec3 mid = vec3(0.09, 0.22, 0.4);
  vec3 warm = vec3(0.95, 0.63, 0.32);
 
  float wave = 0.5 + 0.5 * sin((p.x + p.y) * 2.4 + uTime * 0.35);
  float grain = hash(floor(uv * 500.0)) * 0.05;
 
  vec3 col = mix(deep, mid, wave);
  col += warm * glow * 0.65;
  col += vec3(0.3, 0.55, 0.85) * glow2 * 0.55;
  col += grain;
 
  gl_FragColor = vec4(col, 1.0);
}`;
 
  const program = createProgram(gl, vs, fs);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1,
    -1, 1, 1, -1, 1, 1,
  ]), gl.STATIC_DRAW);
 
  const aPos = gl.getAttribLocation(program, "aPos");
  const uRes = gl.getUniformLocation(program, "uRes");
  const uTime = gl.getUniformLocation(program, "uTime");
 
  let raf = 0;
 
  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.floor(window.innerWidth * dpr);
    const h = Math.floor(window.innerHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
 
  const start = performance.now();
 
  const draw = () => {
    resize();
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
 
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, (performance.now() - start) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
 
    raf = requestAnimationFrame(draw);
  };
 
  draw();
 
  const onResize = () => resize();
  window.addEventListener("resize", onResize);
 
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", onResize);
  };
}