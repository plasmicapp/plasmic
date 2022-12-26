describe('uniqueLocalId', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('works when calling within same imported module', () => {
    const { uniqueLocalId } = require('./uniqueLocalId');
    const id1 = uniqueLocalId();
    const id2 = uniqueLocalId();
    expect(id2).toBe(id1 + 1);
  });

  it('works when calling different imported modules ', () => {
    const { uniqueLocalId } = require('./uniqueLocalId');
    const id1 = uniqueLocalId();

    // Requiring without resetting modules produces same function from cached module.
    const { uniqueLocalId: sameUniqueLocalId } = require('./uniqueLocalId');
    expect(sameUniqueLocalId).toBe(uniqueLocalId);

    // Requiring after resetting modules produces different function from reloaded module.
    jest.resetModules();
    const { uniqueLocalId: diffUniqueLocalId } = require('./uniqueLocalId');
    expect(diffUniqueLocalId).not.toBe(uniqueLocalId);

    const id2 = uniqueLocalId();
    expect(id2).toBe(id1 + 1);
    const id3 = diffUniqueLocalId();
    expect(id3).toBe(id2 + 1);
  });
});
