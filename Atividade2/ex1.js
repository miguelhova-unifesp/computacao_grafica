// Atividade 2 - linha por Bresenham em WebGL
// clique esquerdo 1: ponto inicial / clique esquerdo 2: ponto final
// teclas 0 a 9: muda a cor da linha

var canvas = document.getElementById("tela");
var gl = canvas.getContext("webgl");


// SHADERS

/* 
o vertex shader recebe a posicao em PIXELS e converte para clip space,
assim o Bresenham trabalha direto na grade de pixels da tela  
*/

var vertexCode = `
  attribute vec2 pos;
  uniform vec2 resolucao;
  uniform float tamanho;
  void main() {
    vec2 zeroUm = pos / resolucao;        // 0..1
    vec2 clip = zeroUm * 2.0 - 1.0;       // -1..1
    gl_Position = vec4(clip, 0.0, 1.0);
    gl_PointSize = tamanho;
  }
`;

var fragCode = `
  precision mediump float;
  uniform vec4 cor;
  void main() {
    gl_FragColor = cor;
  }
`;

var vs = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vs, vertexCode);
gl.compileShader(vs);

var fs = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fs, fragCode);
gl.compileShader(fs);

var prog = gl.createProgram();
gl.attachShader(prog, vs);
gl.attachShader(prog, fs);
gl.linkProgram(prog);
gl.useProgram(prog);

var posLoc = gl.getAttribLocation(prog, "pos");
gl.enableVertexAttribArray(posLoc);

var corLoc = gl.getUniformLocation(prog, "cor");
var resLoc = gl.getUniformLocation(prog, "resolucao");
var tamLoc = gl.getUniformLocation(prog, "tamanho");

gl.uniform2f(resLoc, canvas.width, canvas.height);
gl.uniform1f(tamLoc, 2.0); // 2 px so para a linha ficar visivel na tela

var buf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);


// Estado

// cores indexadas 
var CORES = [
  [0.0, 0.0, 1.0], // 0 azul
  [1.0, 0.0, 0.0], // 1 vermelho
  [0.0, 1.0, 0.0], // 2 verde
  [1.0, 1.0, 0.0], // 3 amarelo
  [0.0, 1.0, 1.0], // 4 ciano
  [1.0, 0.0, 1.0], // 5 magenta
  [1.0, 0.5, 0.0], // 6 laranja
  [0.6, 0.2, 0.9], // 7 roxo
  [1.0, 1.0, 1.0], // 8 branco
  [0.5, 0.5, 0.5]  // 9 cinza
];

var corAtual = CORES[0];          // comeca azul
var linha = { x0: 0, y0: 0, x1: 0, y1: 0 };  // linha inicial (0,0)-(0,0)
var pontoInicial = null;          // guarda o 1o clique ate vir o 2o

// funcao 1: imprimir a linha entre dois pontos

// gera os pixels com Bresenham e manda como GL_POINTS
function imprimeLinha(x0, y0, x1, y1) {
  var pixels = bresenham(x0, y0, x1, y1);

  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pixels), gl.STATIC_DRAW);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
  gl.uniform4f(corLoc, corAtual[0], corAtual[1], corAtual[2], 1.0);
  gl.drawArrays(gl.POINTS, 0, pixels.length / 2);
}

// algoritmo de Bresenham
function bresenham(x0, y0, x1, y1) {
  x0 = Math.round(x0); y0 = Math.round(y0);
  x1 = Math.round(x1); y1 = Math.round(y1);

  var pixels = [];

  var dx = Math.abs(x1 - x0);
  var dy = Math.abs(y1 - y0);

  // sentido em x
  var sx;
  if (x0 < x1) {
    sx = 1;
  } else {
    sx = -1;
  }

  // sentido em y
  var sy;
  if (y0 < y1) {
    sy = 1;
  } else {
    sy = -1;
  }

  var erro = dx - dy;

  while (true) {
    // +0.5 centraliza o ponto dentro do pixel
    pixels.push(x0 + 0.5, y0 + 0.5);

    // chegou no ponto final: encerra o laco
    if (x0 === x1 && y0 === y1) {
      break;
    }

    var e2 = 2 * erro;
    // anda um pixel em x
    if (e2 > -dy) {
      erro -= dy;
      x0 += sx;
    }

    // anda um pixel em y
    if (e2 < dx) {
      erro += dx;
      y0 += sy;
    }
  }

  return pixels;
}

// funcao 2: alterar a cor da linha
function mudaCor(indice) {
  // indice fora da tabela de cores: ignora
  if (indice < 0 || indice > 9) {
    return;
  }

  corAtual = CORES[indice];
  redesenha();
}

// desenho da cena
function redesenha() {
  gl.clearColor(0.05, 0.05, 0.05, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  imprimeLinha(linha.x0, linha.y0, linha.x1, linha.y1);

  // marca o 1o clique enquanto o 2o nao chega
  if (pontoInicial !== null) {
    imprimeLinha(pontoInicial.x, pontoInicial.y, pontoInicial.x, pontoInicial.y);
  }

  mostraInfo();
}

function mostraInfo() {
  var info = document.getElementById("info");
  // a pagina pode nao ter o elemento de info
  if (info === null) {
    return;
  }

  var texto =
    "linha: (" + linha.x0 + "," + linha.y0 + ") -> (" + linha.x1 + "," + linha.y1 + ")";

  if (pontoInicial !== null) {
    texto += "   | aguardando o 2o clique...";
  }

  info.textContent = texto;
}

// EVENTOS

// clique com o botao esquerdo do mouse
canvas.addEventListener("mousedown", function (ev) {
  // so botao esquerdo
  if (ev.button !== 0) {
    return;
  }

  var r = canvas.getBoundingClientRect();
  var x = Math.round((ev.clientX - r.left) * canvas.width / r.width);

  // y invertido: no canvas cresce pra baixo, no WebGL cresce pra cima {horroroso >:(   }. 
  
  var y = Math.round(canvas.height - (ev.clientY - r.top) * canvas.height / r.height);

  if (pontoInicial === null) {
    // 1o clique
    pontoInicial = { x: x, y: y };
  } else {
    // 2o clique
    linha = { x0: pontoInicial.x, y0: pontoInicial.y, x1: x, y1: y };
    pontoInicial = null;
  }

  redesenha();
});

// teclas 0 a 9 escolhem a cor
window.addEventListener("keydown", function (ev) {
  if (ev.key >= "0" && ev.key <= "9") {
    mudaCor(parseInt(ev.key, 10));
  }
});

// linha inicial azul entre (0,0) e (0,0)
redesenha();
