import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

const faqItems = [
  {
    question: 'What is CowFi?',
    answer:
      'CowFi is a platform where herd pools are tokenized so users can buy, hold, and trade herd shares with transparent portfolio tracking.',
  },
  {
    question: 'How do I start using the platform?',
    answer:
      'Create an account, verify your email, connect your wallet, and then open Marketplace or Herd pages to explore available pools.',
  },
  {
    question: 'Can I use devnet wallets?',
    answer:
      'Yes. If your Phantom wallet is on devnet, CowFi balance tools will try to detect and use that network for wallet balance checks.',
  },
  {
    question: 'How are dividends handled?',
    answer:
      'Dividends are reflected in your portfolio metrics, and you can claim available rewards from your profile when they are ready.',
  },
  {
    question: 'Is this investment advice?',
    answer:
      'No. CowFi provides tooling and analytics only and does not provide financial, legal, or tax advice.',
  },
]

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-foreground">FAQ</h1>
      <p className="mt-3 text-muted-foreground">Answers to common questions about CowFi.</p>

      <Accordion type="single" collapsible className="mt-8 rounded-2xl border border-border bg-card px-5">
        {faqItems.map((item) => (
          <AccordionItem key={item.question} value={item.question}>
            <AccordionTrigger className="text-base text-foreground">{item.question}</AccordionTrigger>
            <AccordionContent className="leading-6 text-muted-foreground">{item.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
