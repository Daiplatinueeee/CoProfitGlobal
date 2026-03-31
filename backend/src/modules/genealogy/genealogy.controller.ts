import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import { GenealogyService } from './genealogy.service'
import { PlaceMemberDto } from './dto/place-member.dto'

@Controller('genealogy')
export class GenealogyController {
  constructor(private readonly genealogyService: GenealogyService) {}

  // auto-create root if missing, then return full root tree
  @Get('root/:userId')
  getOrCreateRoot(@Param('userId') userId: string) {
    return this.genealogyService.getOrCreateRoot(userId)
  }

  // return full tree for a user if already placed
  @Get('tree/:userId')
  getTree(@Param('userId') userId: string) {
    return this.genealogyService.getTree(userId)
  }

  // add/place a member under a parent on left or right
  @Post('place')
  placeMember(@Body() dto: PlaceMemberDto) {
    return this.genealogyService.placeMember(dto)
  }

  // direct children only
  @Get('children/:userId')
  getChildren(@Param('userId') userId: string) {
    return this.genealogyService.getChildren(userId)
  }

  // all downlines recursively
  @Get('downlines/:userId')
  getDownlines(@Param('userId') userId: string) {
    return this.genealogyService.getDownlines(userId)
  }

  // check if target user is inside source user's downline tree
  @Get('is-downline/:sourceUserId/:targetUserId')
  isDownline(
    @Param('sourceUserId') sourceUserId: string,
    @Param('targetUserId') targetUserId: string,
  ) {
    return this.genealogyService.isDownline(sourceUserId, targetUserId)
  }

  @Get('referrals/:userId')
  getReferralCounts(@Param('userId') userId: string) {
    return this.genealogyService.getReferralCounts(userId)
  }

  @Get('referral-relation/:rootUserId/:targetUserId')
  getReferralRelation(
    @Param('rootUserId') rootUserId: string,
    @Param('targetUserId') targetUserId: string,
  ) {
    return this.genealogyService.getReferralRelation(rootUserId, targetUserId)
  }

  @Get(':userId/spillover-bonus')
  async getSpilloverBonus(@Param('userId') userId: string) {
    return this.genealogyService.getSpilloverBonus(userId)
  }

}