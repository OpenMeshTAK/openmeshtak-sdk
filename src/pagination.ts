import type { PageInfo, PageRequest } from "./types.js";

/** Any OpenMeshTak list response. */
export interface Page<T> {
  items: T[];
  page: PageInfo;
}

/**
 * Yields every item of a list, fetching the next page only when the previous one is used up.
 *
 * ```ts
 * for await (const member of paginate((page) => client.listEventMembers(eventId, page))) { ... }
 * ```
 */
export async function* paginate<T>(fetchPage: (page: PageRequest) => Promise<Page<T>>): AsyncGenerator<T, void, undefined> {
  let page: PageRequest = {};
  for (;;) {
    const result = await fetchPage(page);
    yield* result.items;

    const nextCursor = result.page.nextCursor;
    if (!result.page.hasMore || nextCursor === null || nextCursor === undefined) {
      return;
    }
    page = { cursor: nextCursor };
  }
}
