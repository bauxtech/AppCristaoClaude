// A gravação do armazenamento é adiada: zera entre os testes para nenhum relógio sobrar depois do fim.
afterEach(() => {
  try {
    require('./src/lib/storage').resetStorageCacheForTests()
  } catch {
    // Teste que não usa o armazenamento.
  }
})
