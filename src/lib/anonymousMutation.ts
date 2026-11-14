// The server returns 428 only before any mutation, to establish its signed cookie.
// Never retry network failures or 5xx responses: the write may already have committed.
export async function anonymousMutation(body: string, method: 'POST' | 'PATCH'): Promise<Response> {
  const send = () => fetch('/api/smoking-areas', {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  let response = await send();
  if (response.status === 428) response = await send();
  return response;
}
