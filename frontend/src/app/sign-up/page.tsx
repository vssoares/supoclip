import { SignUp } from "@/components/auth/sign-up";
import { AuthFooter } from "@/components/auth/auth-footer";
import { AuthFrame } from "@/components/auth/auth-frame";

export default function SignUpPage() {
  return (
    <AuthFrame footer={<AuthFooter mode="sign-up" />}>
      <SignUp />
    </AuthFrame>
  );
}
