import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esEjecutableCompilado, mismaRuta } from './relevo.js';

test('mismaRuta ignora mayúsculas, barras y barra final', () => {
  assert.equal(mismaRuta('C:\\Users\\Ana\\Documents\\ImpresoraTaberna.exe', 'c:\\users\\ana\\documents\\impresorataberna.EXE'), true);
  assert.equal(mismaRuta('C:/Users/Ana/x.exe', 'C:\\Users\\Ana\\x.exe'), true);
  assert.equal(mismaRuta('C:\\Users\\Ana\\Documents\\..\\Documents\\x.exe', 'C:\\Users\\Ana\\Documents\\x.exe'), true);
  assert.equal(mismaRuta('C:\\Users\\Ana\\Descargas\\x.exe', 'C:\\Users\\Ana\\Documents\\x.exe'), false);
});

test('esEjecutableCompilado distingue node/bun/tsx de un .exe propio', () => {
  assert.equal(esEjecutableCompilado('C:\\Program Files\\nodejs\\node.exe'), false);
  assert.equal(esEjecutableCompilado('/usr/bin/node'), false);
  assert.equal(esEjecutableCompilado('C:\\x\\bun.exe'), false);
  assert.equal(esEjecutableCompilado('C:\\Users\\Ana\\Descargas\\ImpresoraTaberna (1).exe'), true);
});
