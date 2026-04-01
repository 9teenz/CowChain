use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount, Transfer};

declare_id!("CowFi1111111111111111111111111111111111111");

const DIVIDEND_SCALE: u128 = 1_000_000_000_000;

#[program]
pub mod cowfi_herd_pool {
    use super::*;

    pub fn initialize_platform(ctx: Context<InitializePlatform>) -> Result<()> {
        let platform = &mut ctx.accounts.platform;
        platform.authority = ctx.accounts.authority.key();
        platform.quote_mint = ctx.accounts.quote_mint.key();
        platform.bump = ctx.bumps.platform;
        Ok(())
    }

    pub fn initialize_herd_pool(
        ctx: Context<InitializeHerdPool>,
        name: String,
        total_tokens: u64,
        nav_per_token_e6: u64,
    ) -> Result<()> {
        require!(name.len() <= 64, HerdError::NameTooLong);
        require!(total_tokens > 0, HerdError::InvalidTokenAmount);

        let herd_pool = &mut ctx.accounts.herd_pool;
        herd_pool.platform = ctx.accounts.platform.key();
        herd_pool.authority = ctx.accounts.authority.key();
        herd_pool.mint = ctx.accounts.herd_mint.key();
        herd_pool.quote_vault = ctx.accounts.quote_vault.key();
        herd_pool.name = name;
        herd_pool.total_tokens = total_tokens;
        herd_pool.circulating_tokens = 0;
        herd_pool.nav_per_token_e6 = nav_per_token_e6;
        herd_pool.total_dividends_distributed_e6 = 0;
        herd_pool.cumulative_dividend_per_token = 0;
        herd_pool.bump = ctx.bumps.herd_pool;
        Ok(())
    }

    pub fn buy_tokens_at_nav(ctx: Context<BuyTokensAtNav>, token_amount: u64) -> Result<()> {
        require!(token_amount > 0, HerdError::InvalidTokenAmount);

        let herd_pool = &mut ctx.accounts.herd_pool;
        let position = &mut ctx.accounts.position;

        accrue_dividends(herd_pool, position)?;

        let quote_cost = token_amount
            .checked_mul(herd_pool.nav_per_token_e6)
            .ok_or(HerdError::MathOverflow)?;

        let transfer_accounts = Transfer {
            from: ctx.accounts.buyer_quote_account.to_account_info(),
            to: ctx.accounts.quote_vault.to_account_info(),
            authority: ctx.accounts.buyer.to_account_info(),
        };
        token::transfer(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), transfer_accounts),
            quote_cost,
        )?;

        let mint_accounts = MintTo {
            mint: ctx.accounts.herd_mint.to_account_info(),
            to: ctx.accounts.buyer_herd_account.to_account_info(),
            authority: ctx.accounts.herd_pool.to_account_info(),
        };
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                mint_accounts,
                &[herd_pool_signer_seeds(herd_pool)],
            ),
            token_amount,
        )?;

        herd_pool.circulating_tokens = herd_pool
            .circulating_tokens
            .checked_add(token_amount)
            .ok_or(HerdError::MathOverflow)?;

        position.owner = ctx.accounts.buyer.key();
        position.herd_pool = herd_pool.key();
        position.token_balance = position
            .token_balance
            .checked_add(token_amount)
            .ok_or(HerdError::MathOverflow)?;
        position.dividend_checkpoint = herd_pool.cumulative_dividend_per_token;
        position.bump = ctx.bumps.position;
        Ok(())
    }

    pub fn create_listing(
        ctx: Context<CreateListing>,
        token_amount: u64,
        price_per_token_e6: u64,
    ) -> Result<()> {
        require!(token_amount > 0, HerdError::InvalidTokenAmount);

        let herd_pool = &mut ctx.accounts.herd_pool;
        let position = &mut ctx.accounts.position;
        accrue_dividends(herd_pool, position)?;

        require!(position.available_tokens() >= token_amount, HerdError::InsufficientPosition);

        let transfer_accounts = Transfer {
            from: ctx.accounts.seller_herd_account.to_account_info(),
            to: ctx.accounts.escrow_herd_account.to_account_info(),
            authority: ctx.accounts.seller.to_account_info(),
        };
        token::transfer(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), transfer_accounts),
            token_amount,
        )?;

        let listing = &mut ctx.accounts.listing;
        listing.herd_pool = herd_pool.key();
        listing.seller = ctx.accounts.seller.key();
        listing.price_per_token_e6 = price_per_token_e6;
        listing.tokens_listed = token_amount;
        listing.bump = ctx.bumps.listing;

        position.listed_balance = position
            .listed_balance
            .checked_add(token_amount)
            .ok_or(HerdError::MathOverflow)?;
        position.dividend_checkpoint = herd_pool.cumulative_dividend_per_token;
        Ok(())
    }

    pub fn purchase_listing(ctx: Context<PurchaseListing>, token_amount: u64) -> Result<()> {
        require!(token_amount > 0, HerdError::InvalidTokenAmount);

        let herd_pool = &mut ctx.accounts.herd_pool;
        let seller_position = &mut ctx.accounts.seller_position;
        let buyer_position = &mut ctx.accounts.buyer_position;
        let listing = &mut ctx.accounts.listing;

        accrue_dividends(herd_pool, seller_position)?;
        accrue_dividends(herd_pool, buyer_position)?;

        require!(listing.tokens_listed >= token_amount, HerdError::ListingTooSmall);

        let quote_cost = token_amount
            .checked_mul(listing.price_per_token_e6)
            .ok_or(HerdError::MathOverflow)?;

        let quote_transfer = Transfer {
            from: ctx.accounts.buyer_quote_account.to_account_info(),
            to: ctx.accounts.seller_quote_account.to_account_info(),
            authority: ctx.accounts.buyer.to_account_info(),
        };
        token::transfer(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), quote_transfer),
            quote_cost,
        )?;

        let herd_transfer = Transfer {
            from: ctx.accounts.escrow_herd_account.to_account_info(),
            to: ctx.accounts.buyer_herd_account.to_account_info(),
            authority: ctx.accounts.listing.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                herd_transfer,
                &[listing_signer_seeds(listing)],
            ),
            token_amount,
        )?;

        seller_position.listed_balance = seller_position
            .listed_balance
            .checked_sub(token_amount)
            .ok_or(HerdError::MathOverflow)?;
        seller_position.token_balance = seller_position
            .token_balance
            .checked_sub(token_amount)
            .ok_or(HerdError::MathOverflow)?;
        buyer_position.owner = ctx.accounts.buyer.key();
        buyer_position.herd_pool = herd_pool.key();
        buyer_position.token_balance = buyer_position
            .token_balance
            .checked_add(token_amount)
            .ok_or(HerdError::MathOverflow)?;
        buyer_position.dividend_checkpoint = herd_pool.cumulative_dividend_per_token;
        buyer_position.bump = ctx.bumps.buyer_position;

        listing.tokens_listed = listing
            .tokens_listed
            .checked_sub(token_amount)
            .ok_or(HerdError::MathOverflow)?;

        Ok(())
    }

    pub fn record_cow_sale(
        ctx: Context<RecordCowSale>,
        sale_price_e6: u64,
        nav_repricing_bps: u16,
    ) -> Result<()> {
        require!(sale_price_e6 > 0, HerdError::InvalidSalePrice);

        let herd_pool = &mut ctx.accounts.herd_pool;
        let per_token_dividend = (sale_price_e6 as u128)
            .checked_mul(DIVIDEND_SCALE)
            .ok_or(HerdError::MathOverflow)?
            .checked_div(herd_pool.total_tokens as u128)
            .ok_or(HerdError::MathOverflow)?;

        herd_pool.cumulative_dividend_per_token = herd_pool
            .cumulative_dividend_per_token
            .checked_add(per_token_dividend)
            .ok_or(HerdError::MathOverflow)?;

        let theoretical_drop = sale_price_e6
            .checked_div(herd_pool.total_tokens)
            .ok_or(HerdError::MathOverflow)?;
        let buffered_drop = (theoretical_drop as u128)
            .checked_mul(nav_repricing_bps as u128)
            .ok_or(HerdError::MathOverflow)?
            .checked_div(10_000)
            .ok_or(HerdError::MathOverflow)? as u64;

        herd_pool.nav_per_token_e6 = herd_pool
            .nav_per_token_e6
            .checked_sub(buffered_drop)
            .unwrap_or(1);
        herd_pool.total_dividends_distributed_e6 = herd_pool
            .total_dividends_distributed_e6
            .checked_add(sale_price_e6)
            .ok_or(HerdError::MathOverflow)?;
        Ok(())
    }

    pub fn claim_dividends(ctx: Context<ClaimDividends>) -> Result<()> {
        let herd_pool = &mut ctx.accounts.herd_pool;
        let position = &mut ctx.accounts.position;
        accrue_dividends(herd_pool, position)?;

        let amount = position.pending_dividends_e6;
        require!(amount > 0, HerdError::NothingToClaim);

        let transfer_accounts = Transfer {
            from: ctx.accounts.quote_vault.to_account_info(),
            to: ctx.accounts.owner_quote_account.to_account_info(),
            authority: ctx.accounts.herd_pool.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                transfer_accounts,
                &[herd_pool_signer_seeds(herd_pool)],
            ),
            amount,
        )?;

        position.pending_dividends_e6 = 0;
        position.dividend_checkpoint = herd_pool.cumulative_dividend_per_token;
        Ok(())
    }
}

fn accrue_dividends(herd_pool: &HerdPool, position: &mut InvestorPosition) -> Result<()> {
    let delta = herd_pool
        .cumulative_dividend_per_token
        .checked_sub(position.dividend_checkpoint)
        .ok_or(HerdError::MathOverflow)?;

    if delta == 0 || position.token_balance == 0 {
        position.dividend_checkpoint = herd_pool.cumulative_dividend_per_token;
        return Ok(());
    }

    let accrued = (position.token_balance as u128)
        .checked_mul(delta)
        .ok_or(HerdError::MathOverflow)?
        .checked_div(DIVIDEND_SCALE)
        .ok_or(HerdError::MathOverflow)? as u64;

    position.pending_dividends_e6 = position
        .pending_dividends_e6
        .checked_add(accrued)
        .ok_or(HerdError::MathOverflow)?;
    position.dividend_checkpoint = herd_pool.cumulative_dividend_per_token;
    Ok(())
}

fn herd_pool_signer_seeds<'a>(herd_pool: &'a HerdPool) -> [&'a [u8]; 3] {
    [b"herd-pool", herd_pool.name.as_bytes(), &[herd_pool.bump]]
}

fn listing_signer_seeds<'a>(listing: &'a MarketplaceListing) -> [&'a [u8]; 3] {
    [b"listing", listing.seller.as_ref(), &[listing.bump]]
}

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    pub quote_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = authority,
        space = 8 + Platform::INIT_SPACE,
        seeds = [b"platform"],
        bump,
    )]
    pub platform: Account<'info, Platform>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct InitializeHerdPool<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut, seeds = [b"platform"], bump = platform.bump)]
    pub platform: Account<'info, Platform>,
    pub herd_mint: Account<'info, Mint>,
    #[account(mut)]
    pub quote_vault: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = authority,
        space = 8 + HerdPool::INIT_SPACE,
        seeds = [b"herd-pool", name.as_bytes()],
        bump,
    )]
    pub herd_pool: Account<'info, HerdPool>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyTokensAtNav<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(mut)]
    pub herd_pool: Account<'info, HerdPool>,
    #[account(mut)]
    pub herd_mint: Account<'info, Mint>,
    #[account(mut)]
    pub quote_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub buyer_quote_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub buyer_herd_account: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = buyer,
        space = 8 + InvestorPosition::INIT_SPACE,
        seeds = [b"position", herd_pool.key().as_ref(), buyer.key().as_ref()],
        bump,
    )]
    pub position: Account<'info, InvestorPosition>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateListing<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,
    #[account(mut)]
    pub herd_pool: Account<'info, HerdPool>,
    #[account(mut)]
    pub seller_herd_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub escrow_herd_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"position", herd_pool.key().as_ref(), seller.key().as_ref()],
        bump = position.bump,
    )]
    pub position: Account<'info, InvestorPosition>,
    #[account(
        init,
        payer = seller,
        space = 8 + MarketplaceListing::INIT_SPACE,
        seeds = [b"listing", seller.key().as_ref(), herd_pool.key().as_ref()],
        bump,
    )]
    pub listing: Account<'info, MarketplaceListing>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PurchaseListing<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(mut)]
    pub herd_pool: Account<'info, HerdPool>,
    #[account(mut)]
    pub listing: Account<'info, MarketplaceListing>,
    #[account(mut)]
    pub buyer_quote_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub seller_quote_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub escrow_herd_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub buyer_herd_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"position", herd_pool.key().as_ref(), listing.seller.as_ref()],
        bump = seller_position.bump,
    )]
    pub seller_position: Account<'info, InvestorPosition>,
    #[account(
        init_if_needed,
        payer = buyer,
        space = 8 + InvestorPosition::INIT_SPACE,
        seeds = [b"position", herd_pool.key().as_ref(), buyer.key().as_ref()],
        bump,
    )]
    pub buyer_position: Account<'info, InvestorPosition>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordCowSale<'info> {
    pub authority: Signer<'info>,
    #[account(mut, has_one = authority)]
    pub herd_pool: Account<'info, HerdPool>,
}

#[derive(Accounts)]
pub struct ClaimDividends<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut)]
    pub herd_pool: Account<'info, HerdPool>,
    #[account(mut)]
    pub quote_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub owner_quote_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        has_one = owner,
        seeds = [b"position", herd_pool.key().as_ref(), owner.key().as_ref()],
        bump = position.bump,
    )]
    pub position: Account<'info, InvestorPosition>,
    pub token_program: Program<'info, Token>,
}

#[account]
#[derive(InitSpace)]
pub struct Platform {
    pub authority: Pubkey,
    pub quote_mint: Pubkey,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct HerdPool {
    pub platform: Pubkey,
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub quote_vault: Pubkey,
    #[max_len(64)]
    pub name: String,
    pub total_tokens: u64,
    pub circulating_tokens: u64,
    pub nav_per_token_e6: u64,
    pub total_dividends_distributed_e6: u64,
    pub cumulative_dividend_per_token: u128,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct InvestorPosition {
    pub owner: Pubkey,
    pub herd_pool: Pubkey,
    pub token_balance: u64,
    pub listed_balance: u64,
    pub pending_dividends_e6: u64,
    pub dividend_checkpoint: u128,
    pub bump: u8,
}

impl InvestorPosition {
    pub fn available_tokens(&self) -> u64 {
        self.token_balance.saturating_sub(self.listed_balance)
    }
}

#[account]
#[derive(InitSpace)]
pub struct MarketplaceListing {
    pub herd_pool: Pubkey,
    pub seller: Pubkey,
    pub price_per_token_e6: u64,
    pub tokens_listed: u64,
    pub bump: u8,
}

#[error_code]
pub enum HerdError {
    #[msg("Math overflow.")]
    MathOverflow,
    #[msg("Invalid token amount.")]
    InvalidTokenAmount,
    #[msg("Listing amount is too small.")]
    ListingTooSmall,
    #[msg("Position does not have enough unlocked tokens.")]
    InsufficientPosition,
    #[msg("No pending dividends are available.")]
    NothingToClaim,
    #[msg("Cow sale price must be positive.")]
    InvalidSalePrice,
    #[msg("Herd name exceeds the maximum length.")]
    NameTooLong,
}