// Minimal stand-in for `zod`.
//
// The Worker only builds declarative input schemas, so the chainable builder
// needs to return something; nothing in this package validates with it.
function schema(kind) {
  const node = { _kind: kind };
  for (const method of ["min", "max", "int", "optional", "describe"]) {
    node[method] = () => node;
  }
  return node;
}

export const z = {
  string: () => schema("string"),
  number: () => schema("number"),
};
