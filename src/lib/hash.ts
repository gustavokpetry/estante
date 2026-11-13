/** SHA-256 em hexadecimal. Usado como identificador do livro. */
export async function sha256Hex(dados: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', dados)
  const bytes = new Uint8Array(digest)
  let hex = ''
  for (const b of bytes) hex += b.toString(16).padStart(2, '0')
  return hex
}
