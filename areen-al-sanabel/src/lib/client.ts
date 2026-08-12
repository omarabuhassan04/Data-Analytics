/** أدوات الاتصال بالـ API من جهة العميل */

export class RequestFailed extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "RequestFailed";
  }
}

async function parseError(response: Response): Promise<never> {
  let message = "تعذّر إتمام العملية";
  try {
    const data = await response.json();
    if (data && typeof data.error === "string") message = data.error;
  } catch {
    /* الاستجابة ليست JSON — نُبقي الرسالة العامة */
  }
  throw new RequestFailed(message, response.status);
}

/** دالة الجلب المستخدمة مع SWR */
export async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) await parseError(response);
  return response.json() as Promise<T>;
}

type Method = "POST" | "PATCH" | "DELETE";

export async function mutateJson<T>(
  url: string,
  method: Method,
  body?: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method,
    credentials: "same-origin",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) await parseError(response);
  return response.json() as Promise<T>;
}

export const apiPost = <T>(url: string, body?: unknown) => mutateJson<T>(url, "POST", body);
export const apiPatch = <T>(url: string, body?: unknown) => mutateJson<T>(url, "PATCH", body);
export const apiDelete = <T>(url: string) => mutateJson<T>(url, "DELETE");

export function errorMessage(error: unknown): string {
  if (error instanceof RequestFailed) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "حدث خطأ غير متوقّع";
}
