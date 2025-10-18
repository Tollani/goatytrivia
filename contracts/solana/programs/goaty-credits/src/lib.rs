use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod goaty_credits {
    use super::*;

    /// Initialize user credits account
    pub fn initialize_credits(ctx: Context<InitializeCredits>) -> Result<()> {
        let user_credits = &mut ctx.accounts.user_credits;
        user_credits.owner = ctx.accounts.user.key();
        user_credits.credits = 0;
        user_credits.bump = *ctx.bumps.get("user_credits").unwrap();
        msg!("Credits account initialized for {}", ctx.accounts.user.key());
        Ok(())
    }

    /// Buy credits by transferring USDC to dev wallet
    pub fn buy_credits(ctx: Context<BuyCredits>, usdc_amount: u64) -> Result<()> {
        require!(usdc_amount > 0, ErrorCode::InvalidAmount);
        require!(usdc_amount >= 1_000_000, ErrorCode::AmountTooSmall); // Min 1 USDC

        // Calculate credits (1 USDC = 1 credit)
        let credits = usdc_amount / 1_000_000;

        // Transfer USDC from user to dev wallet
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_usdc.to_account_info(),
            to: ctx.accounts.dev_usdc.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, usdc_amount)?;

        // Update credits (off-chain via backend, this is just for logging)
        msg!(
            "Credits purchased: user={}, usdc={}, credits={}",
            ctx.accounts.user.key(),
            usdc_amount,
            credits
        );

        emit!(CreditsPurchased {
            user: ctx.accounts.user.key(),
            usdc_amount,
            credits,
        });

        Ok(())
    }

    /// Withdraw accumulated USDC (dev only)
    pub fn withdraw_usdc(ctx: Context<WithdrawUSDC>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);

        let cpi_accounts = Transfer {
            from: ctx.accounts.dev_usdc.to_account_info(),
            to: ctx.accounts.destination.to_account_info(),
            authority: ctx.accounts.dev.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        msg!("USDC withdrawn: amount={}", amount);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeCredits<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + UserCredits::INIT_SPACE,
        seeds = [b"credits", user.key().as_ref()],
        bump
    )]
    pub user_credits: Account<'info, UserCredits>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyCredits<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_usdc: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = dev_usdc.owner == dev.key() @ ErrorCode::Unauthorized
    )]
    pub dev_usdc: Account<'info, TokenAccount>,
    /// CHECK: Dev wallet, validated via dev_usdc ownership
    pub dev: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct WithdrawUSDC<'info> {
    #[account(
        mut,
        constraint = dev.key() == &pubkey!("E1NDUr8TJ2R3hgupEMKLwARx1a2TJSaNkt5j881LWDVv") @ ErrorCode::Unauthorized
    )]
    pub dev: Signer<'info>,
    #[account(mut)]
    pub dev_usdc: Account<'info, TokenAccount>,
    #[account(mut)]
    pub destination: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[account]
#[derive(InitSpace)]
pub struct UserCredits {
    pub owner: Pubkey,
    pub credits: u64,
    pub bump: u8,
}

#[event]
pub struct CreditsPurchased {
    pub user: Pubkey,
    pub usdc_amount: u64,
    pub credits: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Amount too small, minimum 1 USDC")]
    AmountTooSmall,
    #[msg("Unauthorized")]
    Unauthorized,
}
