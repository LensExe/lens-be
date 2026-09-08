export class ReplyOrmEntity {
  id: string;
  feedbackId: string;
  comment: string;
  isVisible: boolean;
  isEdited: boolean;
  repliedBy: string;
  createdAt: Date;
}
