import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import { parseTikbookNotebook, parseMarkdownRouterOSNotebook, serializeTikbookNotebook, serializeMarkdownRouterOSNotebook } from '../src/notebook';

describe('TikBook Notebook Parsing', () => {
  it('parses a simple .md.rsc (RouterOS TikBook) notebook', () => {
    const input = `#.markdown\n#  # Title\n#.\n\n/ip/address/print\n#.\n`;
    const nb = parseTikbookNotebook(input);
    expect(nb.cells).to.have.length(2);
    expect(nb.cells[0].kind).to.equal('markup');
    expect(nb.cells[1].kind).to.equal('code');
    expect(nb.cells[0].value).to.include('# Title');
    expect(nb.cells[1].value).to.include('/ip/address/print');
  });

  it('parses a .rsc.md (Markdown RouterOS) notebook', () => {
    const input = `# Title\n\n```routeros\n/ip/address/print\n```\n`;
    const nb = parseMarkdownRouterOSNotebook(input);
    expect(nb.cells).to.have.length(2);
    expect(nb.cells[0].kind).to.equal('markup');
    expect(nb.cells[1].kind).to.equal('code');
    expect(nb.cells[1].value).to.include('/ip/address/print');
  });

  it('handles explicit cell breaks in Markdown RouterOS', () => {
    const input = `# Title\n\n[//]: #.\n\n## Section\n\n```routeros\n:global foo "bar"\n```\n`;
    const nb = parseMarkdownRouterOSNotebook(input);
    expect(nb.cells).to.have.length(3);
    expect(nb.cells[1].kind).to.equal('markup');
    expect(nb.cells[2].kind).to.equal('code');
  });

  it('serializes and parses round-trip for .md.rsc', () => {
    const input = `#.markdown\n#  # Title\n#.\n\n/ip/address/print\n#.\n`;
    const nb = parseTikbookNotebook(input);
    const out = serializeTikbookNotebook(nb);
    const nb2 = parseTikbookNotebook(out);
    expect(nb2.cells).to.deep.equal(nb.cells);
  });

  it('serializes and parses round-trip for .rsc.md', () => {
    const input = `# Title\n\n```routeros\n/ip/address/print\n```\n`;
    const nb = parseMarkdownRouterOSNotebook(input);
    const out = serializeMarkdownRouterOSNotebook(nb);
    const nb2 = parseMarkdownRouterOSNotebook(out);
    expect(nb2.cells).to.deep.equal(nb.cells);
  });

  it('handles edge cases: empty cells, multiple markdown/code in a row', () => {
    const input = `#.markdown\n#  # Title\n#.\n#.markdown\n#  \n#.\n/ip/address/print\n#.\n/ip/route/print\n#.\n`;
    const nb = parseTikbookNotebook(input);
    expect(nb.cells).to.have.length(4);
    expect(nb.cells[1].kind).to.equal('markup');
    expect(nb.cells[2].kind).to.equal('code');
    expect(nb.cells[3].kind).to.equal('code');
  });

  it('handles edge cases: markdown with code fence inside', () => {
    const input = `# Title\n\nHere is a code example:\n\n```routeros\n/ip/address/print\n```\n\nAnd more text.`;
    const nb = parseMarkdownRouterOSNotebook(input);
    expect(nb.cells).to.have.length(3);
    expect(nb.cells[0].kind).to.equal('markup');
    expect(nb.cells[1].kind).to.equal('code');
    expect(nb.cells[2].kind).to.equal('markup');
  });

  it('parses shebang and notebook metadata in Markdown format', () => {
    const input = '[//]: #!tikbook\n\n# Title\n\n```routeros\n/ip/address/print\n```\n';
    const nb = parseMarkdownRouterOSNotebook(input);
    expect(nb.metadata).to.have.property('shebang');
    expect(nb.cells[0].kind).to.equal('markup');
    expect(nb.cells[1].kind).to.equal('code');
  });

  it('handles excessive whitespace and empty lines', () => {
    const input = `\n\n#.markdown\n#  # Title\n#.\n\n\n/ip/address/print\n#.\n\n`;
    const nb = parseTikbookNotebook(input);
    expect(nb.cells).to.have.length(2);
    expect(nb.cells[0].value).to.include('# Title');
    expect(nb.cells[1].value).to.include('/ip/address/print');
  });

  it('handles malformed input gracefully', () => {
    const input = `#.markdown\n#  # Title\n/ip/address/print\n#.\n`;
    const nb = parseTikbookNotebook(input);
    expect(nb.cells.length).to.be.greaterThan(0);
  });

  it('round-trips with cell metadata', () => {
    const input = `# Title\n\n```routeros\n/ip/address/print\n```\n`;
    const nb = parseMarkdownRouterOSNotebook(input);
    // Add fake metadata to a cell
    nb.cells[1].metadata = { foo: 'bar' };
    const out = serializeMarkdownRouterOSNotebook(nb);
    const nb2 = parseMarkdownRouterOSNotebook(out);
    // Metadata is not persisted, but test should not throw
    expect(nb2.cells[1].value).to.include('/ip/address/print');
  });
});
