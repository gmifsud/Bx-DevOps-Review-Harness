import { AIReview } from '../domain/types';

export interface IAIService {
    reviewCodeDiff(diffText: string): Promise<AIReview>;
}
