import { SignIn } from "@/components/auth/sign-in";
import { AuthFooter } from "@/components/auth/auth-footer";
import { AuthFrame } from "@/components/auth/auth-frame";

export default function SignInPage() {
  return (
    <AuthFrame footer={<AuthFooter mode="sign-in" />}>
      <SignIn />
    </AuthFrame>
  );
}
