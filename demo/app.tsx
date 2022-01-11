import React, { useCallback, useEffect, useState } from "react";
import { flatten, Table, TableResolver } from "../src";
import { TablePreview } from "./table-preview";

interface SerializedSchema {
  readonly version: string;
  readonly tables: { readonly [name: string]: TableResolver };
}

export const App: React.FC = () => {
  const [source, setSource] = useState("");
  const [schema, setSchema] = useState("");
  const [tables, setTables] = useState<{ readonly [name: string]: Table }>();
  useEffect(() => {
    fetch("/demo/sample-data.json")
      .then((r) => r.text())
      .then((s) => setSource((prev) => (prev !== "" ? prev : s)));
    fetch("/demo/sample-schema.json")
      .then((r) => r.text())
      .then((s) => setSchema((prev) => (prev !== "" ? prev : s)));
  }, []);
  const handleSourceInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setSource(e.currentTarget.value);
      setTables(undefined);
    },
    []
  );
  const handleSchemaInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setSchema(e.currentTarget.value);
      setTables(undefined);
    },
    []
  );

  function run() {
    try {
      const data = parseSourceJson(source);
      const serializedSchema = parseSchema(schema);
      setTables(flatten(data, serializedSchema.tables));
    } catch (e) {
      alert(`${e}`);
      throw e;
    }
  }

  return (
    <div className="app">
      <h1>json-flatten-relational</h1>
      <div className="app__links">
        <a className="app__link" href="#" target="_blank">
          Docs
        </a>
        <a className="app__link" href="#" target="_blank">
          GitHub
        </a>
      </div>

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
        Object.entries(tables).map(([name, data]) => (
          <TablePreview key={name} name={name} data={data} />
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
  if (result.version !== "1") {
    throw new Error("Unsupported schema version.");
  }
  if (typeof result.tables !== "object") {
    throw new Error("Schema has no tables.");
  }
  return result;
}
