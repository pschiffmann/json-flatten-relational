import React, { useCallback, useState } from "react";
import { Table } from "../src";

export const TablePreview = React.memo<{
  readonly name: string;
  readonly data: Table;
}>(({ name, data }) => {
  const [open, setOpen] = useState(false);
  const toggleOpen = useCallback(
    (e: React.SyntheticEvent<HTMLDetailsElement>) => {
      setOpen(e.currentTarget.open);
    },
    []
  );

  const columns = [...data.header];

  return (
    <details className="table-preview" open={open} onToggle={toggleOpen}>
      <summary className="table-preview__name">{name}</summary>

      {open && (
        <div className="table-preview__container">
          <table className="table-preview__table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column} className="table-preview__header">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr key={i} className="table-preview__row">
                  {columns.map((column) => {
                    const value = row[column];
                    return (
                      <td
                        key={column}
                        className={
                          "table-preview__cell table-preview__cell--" +
                          typeof value
                        }
                      >
                        {value}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </details>
  );
});
