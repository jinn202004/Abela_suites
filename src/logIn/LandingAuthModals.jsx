import ForgotPasswordModal from './ForgotPasswordModal'
import LoginModal from './LoginModal'
import SetNewPasswordModal from '../components/SetNewPasswordModal'
import VerificationCodeModal from '../components/VerificationCodeModal'

export default function LandingAuthModals({
  loginOpen,
  forgotOpen,
  verifyOpen,
  newPasswordOpen,
  loginNotice,
  codeError,
  newPwError,
  resendError,
  closeModals,
  openLogin,
  openForgot,
  onRequestPasswordReset,
  onResendResetCode,
  onVerifyResetCode,
  onSetNewPassword,
  onClearNewPwError,
  onClearCodeError,
  handleLoginSuccess,
}) {
  return (
    <>
      <LoginModal
        key={loginOpen ? 'login-open' : 'login-closed'}
        isOpen={loginOpen}
        onClose={closeModals}
        onForgotPassword={openForgot}
        onLoginSuccess={handleLoginSuccess}
        notice={loginNotice}
      />
      <ForgotPasswordModal
        key={forgotOpen ? 'forgot-open' : 'forgot-closed'}
        isOpen={forgotOpen}
        onClose={closeModals}
        onBackToLogin={openLogin}
        onSubmitted={onRequestPasswordReset}
      />
      <VerificationCodeModal
        key={verifyOpen ? 'verify-open' : 'verify-closed'}
        isOpen={verifyOpen}
        onClose={closeModals}
        submissionError={codeError}
        resendError={resendError}
        onClearSubmissionError={onClearCodeError}
        onResend={() => void onResendResetCode?.()}
        onValidCode={(code) => void onVerifyResetCode?.(code)}
      />
      <SetNewPasswordModal
        key={newPasswordOpen ? 'setpw-open' : 'setpw-closed'}
        isOpen={newPasswordOpen}
        onClose={closeModals}
        onBackToLogin={openLogin}
        serverError={newPwError}
        onDismissServerError={onClearNewPwError}
        onPasswordSet={(password) => void onSetNewPassword?.(password)}
      />
    </>
  )
}
