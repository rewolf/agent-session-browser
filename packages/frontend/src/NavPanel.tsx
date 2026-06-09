import React, { useEffect, useState } from "react";
import { fetchTree } from "./api";
import type { SourceFilter } from "./sourceFilter";
import type { NavTreeNode } from "./types";

type Props = {
  pathPrefix: string;
  sourceFilter: SourceFilter;
  onNavigate: (prefix: string) => void;
};

export function NavPanel({ pathPrefix, sourceFilter, onNavigate }: Props) {
  const [tree, setTree] = useState<NavTreeNode | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setErr(null);
    fetchTree(sourceFilter)
      .then(setTree)
      .catch((e: Error) => setErr(e.message));
  }, [sourceFilter]);

  if (err) return <div className="nav-error">{err}</div>;
  if (!tree) return <div className="nav-loading">Indexing…</div>;

  function findSubtree(node: NavTreeNode, target: string): NavTreeNode {
    const norm = (p: string) => p.replace(/\/+$/, "");
    const t = norm(target);
    if (!t || node.pathPrefix === target) return node;
    for (const c of node.children) {
      const cp = norm(c.pathPrefix);
      if (t === cp || t.startsWith(cp + "/")) {
        return findSubtree(c, target);
      }
    }
    return node;
  }

  const current = pathPrefix ? findSubtree(tree, pathPrefix) : tree;

  return (
    <div className="nav-panel">
      <div className="nav-breadcrumb">
        <button
          type="button"
          className="ghost-link"
          onClick={() => onNavigate(tree.pathPrefix)}
        >
          root
        </button>
        {pathPrefix &&
          tree.pathPrefix !== pathPrefix &&
          pathPrefix.startsWith(tree.pathPrefix) &&
          pathPrefix.slice(tree.pathPrefix.length).split(/[/\\]+/).filter(Boolean).map((_seg, i, arr) => {
            const full = tree.pathPrefix
              ? tree.pathPrefix + "/" + arr.slice(0, i + 1).join("/")
              : arr.slice(0, i + 1).join("/");
            const label = arr[i];
            return (
              <span key={full}>
                {" "}
                /{" "}
                <button type="button" className="ghost-link" onClick={() => onNavigate(full)}>
                  {label}
                </button>
              </span>
            );
          })}
      </div>
      <ul className="nav-children">
        {current.children.map((c) => (
          <li key={c.pathPrefix}>
            <button type="button" onClick={() => onNavigate(c.pathPrefix)}>
              {c.label || c.pathPrefix}
            </button>
          </li>
        ))}
      </ul>
      {current.workspaceRootsHere.length > 0 && (
        <div className="nav-workspaces">
          <div className="nav-subtitle">Workspaces here</div>
          <ul>
            {current.workspaceRootsHere.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
