import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user';
import { CommentResponse, CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/comment.dto';

@ApiTags('comments')
@ApiBearerAuth()
@Controller('tickets/:ticketId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @ApiOperation({ summary: 'List comments on a ticket the caller can access' })
  list(
    @CurrentUser() user: AuthUser,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
  ): Promise<CommentResponse[]> {
    return this.commentsService.list(user, ticketId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a comment / reply to a ticket the caller can access' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentResponse> {
    return this.commentsService.create(user, ticketId, dto);
  }
}
