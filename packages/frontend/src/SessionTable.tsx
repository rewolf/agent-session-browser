import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import React from "react";
import { BookmarkButton } from "./BookmarkButton";
import { ColumnVisibilityMenu } from "./ColumnVisibilityMenu";
import { CopyableCell } from "./CopyButton";
import { formatLocaleDateTime, formatLocaleDateTimeTitle } from "./format";
import { SessionActionsCell } from "./SessionActionsCell";
import { SessionIdCell } from "./SessionIdCell";
import { SessionNameCell } from "./SessionNameCell";
import { MetadataBadges } from "./MetadataBadges";
import { SourceBadge } from "./SourceBadge";
import {
  getSessionAlias,
  isSessionBookmarked,
  type SessionAnnotationsMap,
} from "./sessionAnnotations";
import type { ApiSession } from "./types";
import { useMetadataColumnVisible } from "./useMetadataColumnVisible";

type Props = {
  data: ApiSession[];
  loading: boolean;
  error?: string | null;
  annotations: SessionAnnotationsMap;
  onToggleBookmark: (source: string, sessionId: string) => void;
  onAliasChange: (
    source: string,
    sessionId: string,
    alias: string | undefined
  ) => void;
  bookmarkSortEnabled: boolean;
};

export function SessionTable({
  data,
  loading,
  error,
  annotations,
  onToggleBookmark,
  onAliasChange,
  bookmarkSortEnabled,
}: Props) {
  const [metadataVisible, setMetadataVisible] = useMetadataColumnVisible();
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "updatedAt", desc: true },
  ]);

  const effectiveSorting = React.useMemo(() => {
    if (!bookmarkSortEnabled) {
      return sorting;
    }
    const userSort = sorting.filter((s) => s.id !== "bookmark");
    return [{ id: "bookmark", desc: true }, ...userSort];
  }, [bookmarkSortEnabled, sorting]);

  const columns = React.useMemo<ColumnDef<ApiSession>[]>(() => {
    const defs: ColumnDef<ApiSession>[] = [
      {
        id: "bookmark",
        header: "",
        enableSorting: false,
        accessorFn: (row) =>
          isSessionBookmarked(annotations, row.source, row.sessionId) ? 1 : 0,
        sortingFn: "basic",
        cell: (info) => {
          const row = info.row.original;
          const bookmarked = isSessionBookmarked(
            annotations,
            row.source,
            row.sessionId
          );
          return (
            <BookmarkButton
              bookmarked={bookmarked}
              onToggle={() => onToggleBookmark(row.source, row.sessionId)}
            />
          );
        },
      },
      {
        accessorKey: "source",
        header: "Source",
        cell: (info) => <SourceBadge source={info.row.original.source} />,
      },
      {
        accessorKey: "sessionId",
        header: "ID",
        cell: (info) => (
          <SessionIdCell sessionId={info.row.original.sessionId} />
        ),
      },
      {
        accessorFn: (r) => {
          const alias = getSessionAlias(annotations, r.source, r.sessionId);
          return alias ?? r.name ?? "";
        },
        id: "name",
        header: "Name",
        cell: (info) => {
          const row = info.row.original;
          return (
            <SessionNameCell
              name={row.name}
              alias={getSessionAlias(annotations, row.source, row.sessionId)}
              onAliasChange={(alias) =>
                onAliasChange(row.source, row.sessionId, alias)
              }
            />
          );
        },
      },
    ];

    if (metadataVisible) {
      defs.push({
        id: "metadata",
        header: "Metadata",
        enableSorting: false,
        cell: (info) => {
          const row = info.row.original;
          return (
            <MetadataBadges source={row.source} metadata={row.metadata} />
          );
        },
      });
    }

    defs.push(
      {
        accessorKey: "workspaceLeaf",
        header: "Workspace",
        cell: (info) => (
          <CopyableCell
            text={info.row.original.workspacePath}
            label="workspace path"
          >
            <span
              title={(info.row.original.workspaceRoots ?? []).join("\n")}
            >
              {String(info.getValue())}
            </span>
          </CopyableCell>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        sortingFn: "basic",
        cell: (info) => {
          const ms = Number(info.getValue());
          return (
            <span
              className="date-cell"
              title={formatLocaleDateTimeTitle(ms)}
            >
              {formatLocaleDateTime(ms)}
            </span>
          );
        },
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        sortingFn: "basic",
        cell: (info) => {
          const ms = Number(info.getValue());
          return (
            <span
              className="date-cell"
              title={formatLocaleDateTimeTitle(ms)}
            >
              {formatLocaleDateTime(ms)}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: (info) => (
          <SessionActionsCell
            sessionId={info.row.original.sessionId}
            workspacePath={info.row.original.workspacePath}
            sessionName={info.row.original.name}
            source={info.row.original.source}
            resumeCommand={info.row.original.resumeCommand}
            primaryActions={info.row.original.primaryActions ?? []}
          />
        ),
      }
    );

    return defs;
  }, [
    annotations,
    metadataVisible,
    onAliasChange,
    onToggleBookmark,
  ]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting: effectiveSorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (error) {
    return <div className="table-error">{error}</div>;
  }

  return (
    <div className="session-table-wrap">
      {loading && <div className="table-loading">Loading…</div>}
      <table className="session-table cyber-table">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  className={[
                    h.column.id === "bookmark"
                      ? "session-bookmark-col"
                      : undefined,
                    h.column.id === "actions" ? "table-actions-col" : undefined,
                    h.column.getCanSort() ? "sortable" : undefined,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={h.column.getToggleSortingHandler()}
                  aria-label={
                    h.column.id === "actions"
                      ? "Actions"
                      : h.column.id === "bookmark"
                        ? "Bookmark"
                        : undefined
                  }
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                  {h.column.getCanSort() && h.column.getIsSorted() === "asc"
                    ? " ▲"
                    : h.column.getCanSort() && h.column.getIsSorted() === "desc"
                      ? " ▼"
                      : ""}
                </th>
              ))}
              <th className="column-visibility-col">
                <ColumnVisibilityMenu
                  metadataVisible={metadataVisible}
                  onMetadataVisibleChange={setMetadataVisible}
                />
              </th>
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => {
            const excerpt = row.original.excerpt?.trim();
            const hasExcerpt = Boolean(excerpt);
            const excerptColSpan = row.getVisibleCells().length - 1;
            return (
              <React.Fragment key={row.id}>
                <tr
                  className={
                    hasExcerpt
                      ? "session-row session-row--has-excerpt"
                      : "session-row"
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={[
                        cell.column.id === "bookmark"
                          ? "session-bookmark-col"
                          : undefined,
                        cell.column.id === "actions"
                          ? "table-actions-col"
                          : undefined,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                  <td className="column-visibility-col" />
                </tr>
                {hasExcerpt && (
                  <tr className="session-excerpt-row">
                    <td className="session-bookmark-col" />
                    <td />
                    <td
                      colSpan={excerptColSpan}
                      className="session-excerpt-cell"
                    >
                      <span className="session-excerpt" title={excerpt}>
                        {excerpt}
                      </span>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
