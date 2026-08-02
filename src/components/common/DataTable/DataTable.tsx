"use client";

import { Empty, Table } from "antd";
import type { TableProps } from "antd";

import { PAGE_SIZE_OPTIONS } from "@/types/common";

export interface DataTablePagination {
  current: number;
  pageSize: number;
  total: number;
  onChange: (page: number, pageSize: number) => void;
}

export interface DataTableProps<T>
  extends Omit<TableProps<T>, "pagination" | "dataSource" | "columns"> {
  columns: TableProps<T>["columns"];
  dataSource: T[];
  loading?: boolean;
  /** Truyền `false` để tắt phân trang (bảng con, bảng chi tiết) */
  pagination?: DataTablePagination | false;
  emptyText?: string;
}

/**
 * Gộp TableData + PagingTable của bản gốc thành một component duy nhất.
 * Khác bản gốc ở chỗ dùng luôn pagination của antd thay vì TablePagination
 * của MUI, nhưng vẫn giữ kiểu điều khiển từ bên ngoài (page/pageSize/total
 * do trang cha nắm giữ).
 */
export function DataTable<T extends object>({
  columns,
  dataSource,
  loading,
  pagination,
  emptyText = "Không có dữ liệu",
  ...rest
}: DataTableProps<T>) {
  return (
    <Table<T>
      columns={columns}
      dataSource={dataSource}
      loading={loading}
      bordered
      size="middle"
      scroll={{ x: "max-content" }}
      locale={{
        emptyText: (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={emptyText}
          />
        ),
      }}
      pagination={
        pagination === false
          ? false
          : {
              current: pagination?.current,
              pageSize: pagination?.pageSize,
              total: pagination?.total,
              onChange: pagination?.onChange,
              showSizeChanger: true,
              pageSizeOptions: PAGE_SIZE_OPTIONS,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} trên ${total} bản ghi`,
            }
      }
      {...rest}
    />
  );
}

export default DataTable;
