"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "antd";

import { PageHeader } from "@/components/common/PageHeader";
import routes from "@/config/routes";
import type { ProductType } from "@/types/product";

import { ProductCreateForm } from "../_components/ProductCreateForm";
import { ProductTypePicker } from "../_components/ProductTypePicker";

/**
 * Luồng tạo hai bước: chọn loại sản phẩm rồi mới tới form.
 *
 * Tách bước vì `productType` chi phối toàn bộ form phía sau (có tồn kho hay
 * không, khai biến thể hay khai thành phần combo) và không sửa được sau khi
 * tạo — để lẫn nó vào một dropdown giữa các field khác thì người dùng rất dễ
 * chọn nhầm mà không nhận ra hậu quả.
 */
export default function NewProductPage() {
  const [productType, setProductType] = useState<ProductType>();

  if (productType) {
    return <ProductCreateForm key={productType} productType={productType} />;
  }

  return (
    <>
      <PageHeader
        title="Thêm sản phẩm"
        description="Chọn loại sản phẩm để bắt đầu"
        breadcrumb={[
          { label: "Quản lý sản phẩm", href: routes.products.index },
          { label: "Thêm mới" },
        ]}
        extra={
          <Link href={routes.products.index}>
            <Button>Huỷ</Button>
          </Link>
        }
      />

      <ProductTypePicker onChange={setProductType} />
    </>
  );
}
