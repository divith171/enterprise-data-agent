// Strict safe subset: paragraphs, line breaks, strong, emphasis, ordered/unordered lists, inline code.
// Everything else (HTML, images, links, embeds) stays literal text; React escapes it.

function findClose(s, marker, from) {
  let j = s.indexOf(marker, from);
  while (j !== -1) {
    const okInner = j > from && s[from] !== " " && s[j - 1] !== " ";
    const notDouble = marker.length === 2 || (s[j + 1] !== marker && s[j - 1] !== marker);
    if (okInner && notDouble) return j;
    j = s.indexOf(marker, j + 1);
  }
  return -1;
}

function parseInline(s, key = "i") {
  const out = [];
  let buf = "";
  let i = 0;
  const flush = () => {
    if (buf) out.push(buf);
    buf = "";
  };
  while (i < s.length) {
    const c = s[i];
    if (c === "\\" && /[\\`*_]/.test(s[i + 1] || "")) {
      buf += s[i + 1];
      i += 2;
      continue;
    }
    if (c === "`") {
      const j = s.indexOf("`", i + 1);
      if (j > i + 1) {
        flush();
        out.push(<code key={`${key}-${i}`}>{s.slice(i + 1, j)}</code>);
        i = j + 1;
        continue;
      }
    }
    const dbl = s.slice(i, i + 2);
    if (dbl === "**" || dbl === "__") {
      const j = findClose(s, dbl, i + 2);
      if (j !== -1) {
        flush();
        out.push(<strong key={`${key}-${i}`}>{parseInline(s.slice(i + 2, j), `${key}-${i}`)}</strong>);
        i = j + 2;
        continue;
      }
    }
    if ((c === "*" || c === "_") && s[i + 1] !== c && !(c === "_" && /\w/.test(s[i - 1] || ""))) {
      const j = findClose(s, c, i + 1);
      if (j !== -1 && !(c === "_" && /\w/.test(s[j + 1] || ""))) {
        flush();
        out.push(<em key={`${key}-${i}`}>{parseInline(s.slice(i + 1, j), `${key}-${i}`)}</em>);
        i = j + 1;
        continue;
      }
    }
    buf += c;
    i += 1;
  }
  flush();
  return out;
}

const withBreaks = (lines, key) =>
  lines.flatMap((line, i) => (i === 0 ? parseInline(line, `${key}-${i}`) : [<br key={`${key}-br${i}`} />, ...parseInline(line, `${key}-${i}`)]));

const OL = /^\s*(\d{1,9})[.)]\s+(.*)$/;
const UL = /^\s*[-*+]\s+(.*)$/;

function parseBlocks(text) {
  const blocks = [];
  let cur = null;
  const close = () => {
    if (cur) blocks.push(cur);
    cur = null;
  };
  for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
    if (!line.trim()) {
      close();
      continue;
    }
    const ol = line.match(OL);
    const ul = !ol && line.match(UL);
    if (ol || ul) {
      const type = ol ? "ol" : "ul";
      if (!cur || cur.type !== type) {
        close();
        cur = { type, start: ol ? Number(ol[1]) : 1, items: [] };
      }
      cur.items.push([ol ? ol[2] : ul[1]]);
    } else if (cur && cur.type !== "p" && /^\s{2,}/.test(line)) {
      cur.items[cur.items.length - 1].push(line.trim());
    } else {
      if (!cur || cur.type !== "p") {
        close();
        cur = { type: "p", lines: [] };
      }
      cur.lines.push(line);
    }
  }
  close();
  return blocks;
}

export function SafeMarkdown({ text }) {
  return parseBlocks(text).map((b, bi) => {
    if (b.type === "p") return <p key={bi}>{withBreaks(b.lines, `p${bi}`)}</p>;
    const items = b.items.map((lines, ii) => <li key={ii}>{withBreaks(lines, `l${bi}-${ii}`)}</li>);
    return b.type === "ol" ? (
      <ol key={bi} start={b.start !== 1 ? b.start : undefined}>{items}</ol>
    ) : (
      <ul key={bi}>{items}</ul>
    );
  });
}
