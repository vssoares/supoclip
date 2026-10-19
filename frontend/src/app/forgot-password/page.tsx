import { ForgotPassword } from "@/components/auth/forgot-password";
import { AuthFooter } from "@/components/auth/auth-footer";
import { AuthFrame } from "@/components/auth/auth-frame";

export default function ForgotPasswordPage() {
  return (
    <AuthFrame footer={<AuthFooter mode="forgot" />}>
      <ForgotPassword />
    </AuthFrame>
  );
}
