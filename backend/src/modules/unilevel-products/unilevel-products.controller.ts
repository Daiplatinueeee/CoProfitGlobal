import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UnilevelProductsService } from './unilevel-products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SubmitPurchaseDto } from './dto/submit-purchase.dto';
import { ApprovePurchaseDto } from './dto/approve-purchase.dto';
import { RedeemPinDto } from './dto/redeem-pin.dto';
import { RedeemRewardDto } from './dto/redeem-reward.dto';
import { CreateLifestyleRewardDto } from '../admin/dto/create-lifestyle-reward.dto';
import { PurchaseStatus } from './schemas/unilevel-purchase.schema';

const uploadDir = join(process.cwd(), 'uploads', 'unilevel-proofs');

@Controller('unilevel-products')
@UseGuards(JwtAuthGuard)
export class UnilevelProductsController {
  constructor(private readonly service: UnilevelProductsService) {}

  // ─── User: Products ──────────────────────────────────────────────────────────

  /** GET /unilevel-products — list active products */
  @Get()
  listProducts() {
    return this.service.listProducts(false);
  }

  // ─── User: Purchases ─────────────────────────────────────────────────────────

  /** GET /unilevel-products/my/pv-status?monthKey=YYYY-MM */
  @Get('my/pv-status')
  pvStatus(@Request() req: any, @Query('monthKey') monthKey?: string) {
    return this.service.getMyPvStatus(req.user.sub, monthKey);
  }

  /** GET /unilevel-products/my/purchases?monthKey=YYYY-MM */
  @Get('my/purchases')
  myPurchases(@Request() req: any, @Query('monthKey') monthKey?: string) {
    return this.service.getMyPurchases(req.user.sub, monthKey);
  }

  /** GET /unilevel-products/my/pin-history */
  @Get('my/pin-history')
  myPinHistory(@Request() req: any) {
    return this.service.getMyPinHistory(req.user.sub);
  }

  /** GET /unilevel-products/my/reward-history */
  @Get('my/reward-history')
  myRewardHistory(@Request() req: any) {
    return this.service.getMyRewardRedemptionHistory(req.user.sub);
  }

  /** POST /unilevel-products/upload-proof — upload payment proof image */
  @Post('upload-proof')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
          cb(null, uploadDir);
        },
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `proof-${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
      fileFilter: (_req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|pdf)$/i;
        cb(null, allowed.test(file.originalname));
      },
    }),
  )
  uploadProof(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return { url: '' };
    }
    return { url: `/uploads/unilevel-proofs/${file.filename}` };
  }

  /** POST /unilevel-products/purchase — submit a purchase request */
  @Post('purchase')
  submitPurchase(@Request() req: any, @Body() dto: SubmitPurchaseDto) {
    return this.service.submitPurchase(req.user.sub, dto);
  }

  /** POST /unilevel-products/redeem-pin — redeem a product PIN for PV */
  @Post('redeem-pin')
  redeemPin(@Request() req: any, @Body() dto: RedeemPinDto) {
    return this.service.redeemPin(req.user.sub, dto);
  }

  // ─── User: Lifestyle rewards ─────────────────────────────────────────────────

  /** GET /unilevel-products/lifestyle-rewards — list active rewards */
  @Get('lifestyle-rewards')
  listLifestyleRewards() {
    return this.service.listLifestyleRewards();
  }

  /** POST /unilevel-products/redeem-lifestyle-reward — spend PV on a reward */
  @Post('redeem-lifestyle-reward')
  redeemLifestyleReward(@Request() req: any, @Body() dto: RedeemRewardDto) {
    return this.service.redeemLifestyleReward(req.user.sub, dto);
  }

  // ─── Admin: Product management ───────────────────────────────────────────────

  /** POST /unilevel-products/admin/products */
  @Post('admin/products')
  createProduct(@Body() dto: CreateProductDto) {
    return this.service.createProduct(dto);
  }

  /** PATCH /unilevel-products/admin/products/:id */
  @Patch('admin/products/:id')
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.service.updateProduct(id, dto);
  }

  /** GET /unilevel-products/admin/products — list all including inactive */
  @Get('admin/products')
  listAllProducts() {
    return this.service.listProducts(true);
  }

  // ─── Admin: Lifestyle reward management ─────────────────────────────────────

  /** POST /unilevel-products/admin/lifestyle-rewards */
  @Post('admin/lifestyle-rewards')
  createLifestyleReward(@Body() dto: CreateLifestyleRewardDto) {
    return this.service.createLifestyleReward(dto);
  }

  /** PATCH /unilevel-products/admin/lifestyle-rewards/:id */
  @Patch('admin/lifestyle-rewards/:id')
  updateLifestyleReward(
    @Param('id') id: string,
    @Body() dto: Partial<CreateLifestyleRewardDto>,
  ) {
    return this.service.updateLifestyleReward(id, dto);
  }

  /** GET /unilevel-products/admin/lifestyle-rewards — list all */
  @Get('admin/lifestyle-rewards')
  listAllLifestyleRewards() {
    return this.service.listAllLifestyleRewards();
  }

  // ─── Admin: Purchase review ──────────────────────────────────────────────────

  /** GET /unilevel-products/admin/purchases/pending */
  @Get('admin/purchases/pending')
  pendingPurchases() {
    return this.service.listPendingPurchases();
  }

  /** GET /unilevel-products/admin/purchases/all?status=pending&userId=xxx */
  @Get('admin/purchases/all')
  allPurchases(
    @Query('status') status?: string,
    @Query('userId') userId?: string,
  ) {
    return this.service.listAllPurchases(
      status as PurchaseStatus | undefined,
      userId,
    );
  }

  /** PATCH /unilevel-products/admin/purchases/:id/approve */
  @Patch('admin/purchases/:id/approve')
  approvePurchase(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ApprovePurchaseDto,
  ) {
    return this.service.approvePurchase(id, req.user.sub, dto);
  }

  /** PATCH /unilevel-products/admin/purchases/:id/reject */
  @Patch('admin/purchases/:id/reject')
  rejectPurchase(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ApprovePurchaseDto,
  ) {
    return this.service.rejectPurchase(id, req.user.sub, dto);
  }
}
