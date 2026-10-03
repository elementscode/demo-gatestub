import { test, equal, errorf } from "@elements/app";
import { staff } from "#app/shared/fixtures";
import { requireAdmin, requireStaff } from "#app/shared/services/auth";

test("admin", () => {
  test("door staff reach the door but not admin", () => {
    staff("door");
    requireStaff();

    try {
      requireAdmin();
      errorf("expected a ForbiddenError");
    } catch (err: any) {
      equal(err.statusCode, 403);
    }
  });

  test("admins pass", () => {
    staff("admin");
    requireAdmin();
  });
});
