import { mockGapItems } from './gapItems';

export async function* gapStreamMock() {
  for (const item of mockGapItems) {
    await new Promise(r => setTimeout(r, 2000));
    yield item;
  }
}
