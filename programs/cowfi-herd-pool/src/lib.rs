use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke, system_instruction};
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount, Transfer};

declare_id!("7CuP8kCTncbmy3H6H1UzvbSTbgKGjLQnRYSSm2aBF8kn");

const DIVIDEND_SCALE: u128 = 1_000_000_000_000;

fn token_amount_to_base_units(token_amount: u64, decimals: u8) -> Result<u64> {
    let scale = 10u64
        .checked_pow(decimals as u32)
        .ok_or(HerdError::MathOverflow)?;

    token_amount
        .checked_mul(scale)
        .ok_or(HerdError::MathOverflow.into())
}

#[program]
pub mod cowchain_herd_pool {
    use super::*;

    pub fn initialize_platform(ctx: Context<InitializePlatform>, total_supply: u64) -> Result<()> {
        require!(total_supply > 0, HerdError::InvalidTokenAmount);
        let platform = &mut ctx.accounts.platform;
        platform.authority = ctx.accounts.authority.key();
        platform.quote_mint = ctx.accounts.quote_mint.key();
        platform.platform_mint = ctx.accounts.platform_mint.key();
        platform.sol_treasury = ctx.accounts.authority.key();
        platform.total_token_supply = total_supply;
        platform.circulating_tokens = 0;
        platform.bump = ctx.bumps.platform;
        Ok(())
    }

    pub fn initialize_herd_pool(
        ctx: Context<InitializeHerdPool>,
        name: String,
        nav_per_token_e6: u64,
    ) -> Result<()> {
        require!(name.len() <= 64, HerdError::NameTooLong);

        let herd_pool = &mut ctx.accounts.herd_pool;
        herd_pool.platform = ctx.accounts.platform.key();
        herd_pool.authority = ctx.accounts.authority.key();
        herd_pool.quote_vault = ctx.accounts.quote_vault.key();
        herd_pool.name = name;
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

        let platform = &mut ctx.accounts.platform;
        let mint_amount = token_amount_to_base_units(token_amount, ctx.accounts.platform_mint.decimals)?;
        let platform_bump = [platform.bump];
        let platform_signer_seeds: &[&[u8]] = &[b"platform", &platform_bump];
        let mint_accounts = MintTo {
            mint: ctx.accounts.platform_mint.to_account_info(),
            to: ctx.accounts.buyer_platform_account.to_account_info(),
            authority: platform.to_account_info(),
        };
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                mint_accounts,
                &[platform_signer_seeds],
            ),
            mint_amount,
        )?;

        platform.circulating_tokens = platform
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

    pub fn buy_tokens_with_sol(
        ctx: Context<BuyTokensWithSol>,
        token_amount: u64,
        sol_price_usd_e6: u64,
        max_lamports: u64,
    ) -> Result<()> {
        require!(token_amount > 0, HerdError::InvalidTokenAmount);
        require!(sol_price_usd_e6 > 0, HerdError::InvalidSolPrice);

        let herd_pool = &mut ctx.accounts.herd_pool;
        let position = &mut ctx.accounts.position;

        accrue_dividends(herd_pool, position)?;

        let quote_cost_e6 = (token_amount as u128)
            .checked_mul(herd_pool.nav_per_token_e6 as u128)
            .ok_or(HerdError::MathOverflow)?;

        let required_lamports = quote_cost_e6
            .checked_mul(1_000_000_000)
            .ok_or(HerdError::MathOverflow)?
            .checked_add(sol_price_usd_e6 as u128 - 1)
            .ok_or(HerdError::MathOverflow)?
            .checked_div(sol_price_usd_e6 as u128)
            .ok_or(HerdError::MathOverflow)?;

        require!(required_lamports > 0, HerdError::InvalidSolPrice);
        require!(required_lamports <= max_lamports as u128, HerdError::SlippageExceeded);

        let platform = &mut ctx.accounts.platform;
        require_keys_eq!(platform.sol_treasury, ctx.accounts.sol_treasury.key(), HerdError::InvalidSolTreasury);

        invoke(
            &system_instruction::transfer(
                &ctx.accounts.buyer.key(),
                &ctx.accounts.sol_treasury.key(),
                required_lamports as u64,
            ),
            &[
                ctx.accounts.buyer.to_account_info(),
                ctx.accounts.sol_treasury.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        let mint_amount = token_amount_to_base_units(token_amount, ctx.accounts.platform_mint.decimals)?;
        let platform_bump = [platform.bump];
        let platform_signer_seeds: &[&[u8]] = &[b"platform", &platform_bump];
        let mint_accounts = MintTo {
            mint: ctx.accounts.platform_mint.to_account_info(),
            to: ctx.accounts.buyer_platform_account.to_account_info(),
            authority: platform.to_account_info(),
        };
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                mint_accounts,
                &[platform_signer_seeds],
            ),
            mint_amount,
        )?;

        platform.circulating_tokens = platform
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
            from: ctx.accounts.seller_platform_account.to_account_info(),
            to: ctx.accounts.escrow_platform_account.to_account_info(),
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

        let listing_bump = [listing.bump];
        let listing_signer_seeds: &[&[u8]] = &[b"listing", listing.seller.as_ref(), &listing_bump];
        let herd_transfer = Transfer {
            from: ctx.accounts.escrow_platform_account.to_account_info(),
            to: ctx.accounts.buyer_platform_account.to_account_info(),
            authority: listing.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                herd_transfer,
                &[listing_signer_seeds],
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

        let platform_total = ctx.accounts.platform.total_token_supply;
        let herd_pool = &mut ctx.accounts.herd_pool;
        let per_token_dividend = (sale_price_e6 as u128)
            .checked_mul(DIVIDEND_SCALE)
            .ok_or(HerdError::MathOverflow)?
            .checked_div(platform_total as u128)
            .ok_or(HerdError::MathOverflow)?;

        herd_pool.cumulative_dividend_per_token = herd_pool
            .cumulative_dividend_per_token
            .checked_add(per_token_dividend)
            .ok_or(HerdError::MathOverflow)?;

        let theoretical_drop = sale_price_e6
            .checked_div(platform_total)
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

        let herd_pool_bump = [herd_pool.bump];
        let herd_pool_signer_seeds: &[&[u8]] = &[b"herd-pool", herd_pool.name.as_bytes(), &herd_pool_bump];
        let transfer_accounts = Transfer {
            from: ctx.accounts.quote_vault.to_account_info(),
            to: ctx.accounts.owner_quote_account.to_account_info(),
            authority: herd_pool.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                transfer_accounts,
                &[herd_pool_signer_seeds],
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

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    pub quote_mint: Account<'info, Mint>,
    pub platform_mint: Account<'info, Mint>,
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
    #[account(mut, seeds = [b"platform"], bump = platform.bump)]
    pub platform: Account<'info, Platform>,
    #[account(mut)]
    pub platform_mint: Account<'info, Mint>,
    #[account(mut)]
    pub quote_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub buyer_quote_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub buyer_platform_account: Account<'info, TokenAccount>,
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
pub struct BuyTokensWithSol<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(mut)]
    pub herd_pool: Account<'info, HerdPool>,
    #[account(mut, seeds = [b"platform"], bump = platform.bump)]
    pub platform: Account<'info, Platform>,
    #[account(mut)]
    pub platform_mint: Account<'info, Mint>,
    #[account(mut)]
    pub sol_treasury: SystemAccount<'info>,
    #[account(mut)]
    pub buyer_platform_account: Account<'info, TokenAccount>,
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
    pub seller_platform_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub escrow_platform_account: Account<'info, TokenAccount>,
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
    pub escrow_platform_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub buyer_platform_account: Account<'info, TokenAccount>,
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
    #[account(seeds = [b"platform"], bump = platform.bump)]
    pub platform: Account<'info, Platform>,
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
    pub platform_mint: Pubkey,
    pub sol_treasury: Pubkey,
    pub total_token_supply: u64,
    pub circulating_tokens: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct HerdPool {
    pub platform: Pubkey,
    pub authority: Pubkey,
    pub quote_vault: Pubkey,
    #[max_len(64)]
    pub name: String,
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
    #[msg("SOL price must be positive.")]
    InvalidSolPrice,
    #[msg("Provided SOL treasury account does not match the platform configuration.")]
    InvalidSolTreasury,
    #[msg("Quoted SOL amount moved outside the allowed slippage window.")]
    SlippageExceeded,
    #[msg("Herd name exceeds the maximum length.")]
    NameTooLong,
}