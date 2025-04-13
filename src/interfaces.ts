export interface IComment {
  id: string;
  userId: string;
  comment: string;
  videoId: string;
  createdAt: string;
}

export interface IVideo {
  url: string;
}

export interface GetCommentsParams {
  videoId: string;
  limit?: number;
  lastEvaluatedKey?: Record<string, any>;
}
