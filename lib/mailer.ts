import nodemailer from 'nodemailer'

export async function sendVerificationEmail(email: string, token: string) {
  const host = process.env.ETHEREAL_SMTP_HOST || 'smtp.ethereal.email'
  const port = Number(process.env.ETHEREAL_SMTP_PORT || 587)
  let user = process.env.ETHEREAL_SMTP_USER
  let pass = process.env.ETHEREAL_SMTP_PASS
  const from = process.env.EMAIL_FROM || 'CowFi <no-reply@cowfi.local>'
  const appUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'http://localhost:3000'

  if (!user || !pass) {
    const testAccount = await nodemailer.createTestAccount()
    user = testAccount.user
    pass = testAccount.pass
    console.log('[CowFi Auth] Created Ethereal test mailbox:', testAccount.user)
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: {
      user,
      pass,
    },
  })

  const verifyUrl = `${appUrl}/signup?verifyToken=${token}`

  const info = await transporter.sendMail({
    from,
    to: email,
    subject: 'Verify your CowFi email',
    html: `<p>Welcome to CowFi.</p><p>Confirm your email: <a href="${verifyUrl}">${verifyUrl}</a></p><p>This link expires in 30 minutes.</p>`,
  })

  const previewUrl = nodemailer.getTestMessageUrl(info)
  if (previewUrl) {
    console.log(`[CowFi Auth] Ethereal preview URL for ${email}: ${previewUrl}`)
  }
}
