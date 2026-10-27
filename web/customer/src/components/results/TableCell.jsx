import { cellText, clipValue, isBinaryType, isLongValue, isNoWrapType, isNumericType } from "@/lib/cellFormat";

export function TableCell({ value, column, rowNumber, onOpen }) {
  const cls = isNumericType(column.type) ? "dk-num" : isNoWrapType(column.type) ? "dk-nowrap" : undefined;
  if (value === null) {
    return (
      <td className={cls}>
        <span aria-hidden="true" className="dk-null">NULL</span>
        <span className="sr-only">No value</span>
      </td>
    );
  }
  const text = cellText(value);
  if (!isLongValue(text)) return <td className={cls}>{text}</td>;
  return (
    <td className={cls ? `${cls} dk-long` : "dk-long"}>
      <span className="dk-cell-clip">{clipValue(text)}</span>
      <button
        type="button"
        className="dk-link-btn"
        data-testid={`view-full-value-r${rowNumber}-c${column.index}`}
        onClick={() => onOpen({ title: column.name, subtitle: `Returned row ${rowNumber}`, value: text, base64: isBinaryType(column.type) })}
      >
        View full value<span className="sr-only">, {column.name}, row {rowNumber}</span>
      </button>
    </td>
  );
}
