// transactions.js
let txs = [];

export async function getTransactions(address) {
  return txs.filter(
    (tx) =>
      tx.from.toLowerCase() === address.toLowerCase() ||
      tx.to.toLowerCase() === address.toLowerCase()
  );
}

export async function addTransaction(entry) {
  txs.unshift(entry);
  console.log("📝 Added transaction:", entry);
  return { ok: true };
}
