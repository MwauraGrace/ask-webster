export function createOllamaClient({ baseUrl = 'http://127.0.0.1:11434', fetchImpl = fetch } = {}) {
  // Adapt the existing RAG interface to Ollama's local chat API.
  return { messages: { create: async ({ model, system, messages, max_tokens }) => {
    // These Qwen3 models use ChatML. Supply a closed, empty thinking block:
    // the locally installed template opens it even with think:false.
    const rawQwen = /^qwen3:(4b|1\.7b)$/i.test(model);
    const clean = text => text.replace(/<\|[^>]*\|>/g, '').replace(/<\/?think>/g, '');
    const allMessages = [{ role: 'system', content: system + '\nReturn JSON with one answer field containing only the requested final text. Do not include reasoning or commentary.' }, ...messages];
    const prompt = rawQwen ? allMessages.map(message =>
      `<|im_start|>${message.role}\n${clean(message.content)}<|im_end|>\n`).join('')
      + '<|im_start|>assistant\n<think>\n\n</think>\n\n' : undefined;
    let response;
    try {
      response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/api/${rawQwen ? 'generate' : 'chat'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(180000),
        body: JSON.stringify({ model, stream: false, think: false,
          format: { type: 'object', properties: { answer: { type: 'string' } }, required: ['answer'], additionalProperties: false },
          ...(rawQwen ? { raw: true, prompt } : { messages: allMessages }),
          options: { temperature: 0, num_ctx: 8192, num_predict: max_tokens, ...(rawQwen ? { stop: ['<|im_end|>', '<|endoftext|>'] } : {}) } }),
      });
    } catch (error) {
      const timeout = ['TimeoutError', 'AbortError'].includes(error.name);
      throw new Error(timeout ? 'The local model took too long. Please try again with a shorter question.'
        : 'Cannot reach Ollama. Open the Ollama app or run ollama serve, then try again.');
    }
    if (!response.ok) {
      throw new Error(response.status === 404
        ? `The local model is missing. Run: ollama pull ${model}`
        : 'Ollama could not generate an answer. Check that the model fits in available memory and try again.');
    }
    const data = await response.json();
    const content = rawQwen ? data.response : data.message?.content;
    if (data.error || data.done !== true || typeof content !== 'string')
      throw new Error('Ollama returned an incomplete response. Please try again.');
    let answer = '';
    try { answer = JSON.parse(content).answer; } catch { /* Invalid/truncated JSON is handled as incomplete output. */ }
    return { content: [{ type: 'text', text: typeof answer === 'string' ? answer : '' }],
      stop_reason: data.done_reason === 'length' ? 'max_tokens' : 'end_turn' };
  } } };
}
