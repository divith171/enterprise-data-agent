import { useEffect, useRef, useState } from "react";
import { isNumericType, LONG_HEADER } from "@/lib/cellFormat";
import { TableCell } from "@/components/results/TableCell";
import { TablePager, PAGE_SIZE, pageRangeText } from "@/components/results/TablePager";
import { FullValueDialog } from "@/components/results/FullValueDialog";
import { useAnnounce } from "@/components/StatusRegion";

function HeaderCell({ column, onOpen }) {
  return (
    <th scope="col" className={isNumericType(column.type) ? "dk-num" : undefined}>
      <span className="dk-th-label">{column.name}</span>
      {column.name.length > LONG_HEADER && (
        <button
          type="button"
          className="dk-link-btn"
          data-testid={`full-column-name-${column.index}`}
          onClick={() => onOpen({ title: "Column name", subtitle: `Column ${column.index + 1}`, value: column.name })}
        >
          Full name<span className="sr-only"> of column {column.index + 1}</span>
        </button>
      )}
    </th>
  );
}

export function ResultTable({ columns, rows, testId }) {
  const announce = useAnnounce();
  const [page, setPage] = useState(0);
  const [dialog, setDialog] = useState(null);
  const [overflowX, setOverflowX] = useState(false);
  const scrollRef = useRef(null);
  const paged = rows.length > PAGE_SIZE;
  const pageRows = paged ? rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) : rows;

  useEffect(() => {
    const el = scrollRef.current;
    const check = () => setOverflowX(el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const goTo = (p) => {
    setPage(p);
    scrollRef.current.scrollTop = 0;
    announce(pageRangeText(p, rows.length));
  };

  return (
    <div className="dk-table-wrap">
      {overflowX && <p className="dk-support" data-testid="table-scroll-hint">Scroll sideways to see more columns.</p>}
      <div className="dk-table-scroll" ref={scrollRef} tabIndex={0} role="region" aria-label="Result table" data-testid={testId}>
        <table className="dk-table">
          <thead>
            <tr>{columns.map((c) => <HeaderCell key={c.index} column={c} onOpen={setDialog} />)}</tr>
          </thead>
          <tbody>
            {pageRows.map((row, ri) => {
              const rowNumber = page * PAGE_SIZE + ri + 1;
              return (
                <tr key={rowNumber}>
                  {columns.map((c) => (
                    <TableCell key={c.index} value={row[c.index]} column={c} rowNumber={rowNumber} onOpen={setDialog} />
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {paged && <TablePager page={page} total={rows.length} onPage={goTo} />}
      <FullValueDialog data={dialog} onClose={() => setDialog(null)} />
    </div>
  );
}
