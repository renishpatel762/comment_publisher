export interface IComment {
  id: string;
  userId: string;
  comment: string;
  videoId: string;
  createdAt: string;
}

export interface IVideo {
  name: string;
  url: string;
}

export interface GetCommentsParams {
  videoId: string;
  limit?: number;
  lastEvaluatedKey?: Record<string, any>;
}
