import { formatCount } from "@/lib/session";

export const PAGE_SIZE = 100;

export const pageRangeText = (page, total) => {
  const start = page * PAGE_SIZE + 1;
  const end = Math.min(total, start + PAGE_SIZE - 1);
  const pages = Math.ceil(total / PAGE_SIZE);
  return `Rows ${formatCount(start)}–${formatCount(end)} of ${formatCount(total)} returned · Page ${page + 1} of ${pages}`;
};

export function TablePager({ page, total, onPage }) {
  const pages = Math.ceil(total / PAGE_SIZE);
  return (
    <div className="dk-pager" data-testid="table-pager">
      <p className="dk-support" data-testid="table-pager-range">{pageRangeText(page, total)}</p>
      <div className="dk-pager-buttons">
        <button type="button" className="dk-btn dk-btn-small" disabled={page === 0} onClick={() => onPage(page - 1)} data-testid="table-pager-previous">
          Previous
        </button>
        <button type="button" className="dk-btn dk-btn-small" disabled={page >= pages - 1} onClick={() => onPage(page + 1)} data-testid="table-pager-next">
          Next
        </button>
      </div>
    </div>
  );
}
