import React, { useCallback, useEffect, useState } from "react";
import XLSX from "xlsx";
import { flatten, Table, TableResolver } from "../../src";
import { TablePreview } from "./table-preview";

interface SerializedSchema {
  readonly version: string;
  readonly resolvers: TableResolver[];
}

export const App: React.FC = () => {
  const [source, setSource] = useState("");
  const [schema, setSchema] = useState("");
  const [tables, setTables] = useState<Map<string, Table>>();
  useEffect(() => {
    fetch("sample-data.json")
      .then((r) => r.text())
      .then((s) => setSource((prev) => (prev !== "" ? prev : s)));
    fetch("sample-schema.json")
      .then((r) => r.text())
      .then((s) => setSchema((prev) => (prev !== "" ? prev : s)));
  }, []);

  const [downloadUrl, setDownloadUrl] = useState<string>();
  useEffect(() => {
    if (!downloadUrl) return;
    return () => {
      URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  const handleSourceInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setSource(e.currentTarget.value);
      setTables(undefined);
      setDownloadUrl(undefined);
    },
    []
  );
  const handleSchemaInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setSchema(e.currentTarget.value);
      setTables(undefined);
      setDownloadUrl(undefined);
    },
    []
  );

  function run() {
    try {
      const data = parseSourceJson(source);
      const serializedSchema = parseSchema(schema);
      setTables(flatten(data, serializedSchema.resolvers));
    } catch (e) {
      alert(`${e}`);
      throw e;
    }
  }

  function createDownloadUrl() {
    const workbook = XLSX.utils.book_new();
    for (const [name, data] of tables!) {
      const columns = [...data.header];
      const worksheet = XLSX.utils.aoa_to_sheet([
        columns,
        ...data.rows.map((row) =>
          columns.map((column) => (row[column] !== null ? row[column] : "null"))
        ),
      ]);
      XLSX.utils.book_append_sheet(workbook, worksheet, name);
    }
    const encoded = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    setDownloadUrl(
      URL.createObjectURL(
        new Blob([encoded], { type: "application/octet-stream" })
      )
    );
  }

  return (
    <div className="app">
      <h1>json-flatten-relational</h1>
      <a
        className="app__link"
        href="https://github.com/pschiffmann/json-flatten-relational#readme"
        target="_blank"
      >
        Docs
      </a>

      <h2>JSON source</h2>
      <textarea
        className="app__textarea"
        value={source}
        onChange={handleSourceInput}
      />

      <h2>Schema</h2>
      <textarea
        className="app__textarea"
        value={schema}
        onChange={handleSchemaInput}
      />

      <h2>Result</h2>
      {!tables && <button onClick={run}>Run</button>}
      {tables &&
        [...tables].map(([name, data]) => (
          <TablePreview key={name} name={name} data={data} />
        ))}
      {tables &&
        (downloadUrl ? (
          <a href={downloadUrl} download="untitled.xlsx">
            Download as .xlsx
          </a>
        ) : (
          <button onClick={createDownloadUrl}>Export as .xslx</button>
        ))}
    </div>
  );
};

function parseSourceJson(source: string): unknown {
  try {
    return JSON.parse(source);
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error(`Invalid JSON source syntax:\n${e}`);
    }
    throw e;
  }
}

function parseSchema(source: string): SerializedSchema {
  let result: any;
  try {
    result = JSON.parse(source);
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error(`Invalid schema syntax:\n${e}`);
    }
    throw e;
  }
  if (result.version !== "2") {
    throw new Error("Unsupported schema version.");
  }
  if (typeof result.resolvers !== "object") {
    throw new Error("Schema has no table resolvers.");
  }
  return result;
}
