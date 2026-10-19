import { Suspense } from "react";
import { ResetPassword } from "@/components/auth/reset-password";
import { AuthFooter } from "@/components/auth/auth-footer";
import { AuthFrame } from "@/components/auth/auth-frame";

export default function ResetPasswordPage() {
  return (
    <AuthFrame footer={<AuthFooter mode="reset" />}>
      <Suspense>
        <ResetPassword />
      </Suspense>
    </AuthFrame>
  );
}
