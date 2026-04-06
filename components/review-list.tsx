import { LinkifiedText } from "@/components/linkified-text";
import { ProductReview } from "@/lib/site-data";

type ReviewListProps = {
  reviews: ProductReview[];
};

export function ReviewList({ reviews }: ReviewListProps) {
  if (!reviews.length) {
    return <p className="empty-state">공개 페이지 기준으로 수집된 상품평이 아직 없습니다.</p>;
  }

  return (
    <div className="review-list">
      {reviews.map((review, index) => (
        <article key={`${review.author}-${review.date}-${index}`} className="review-card">
          <div className="review-meta">
            <strong>{review.author}</strong>
            <span>{review.date ? new Date(review.date).toLocaleDateString("ko-KR") : "날짜 미상"}</span>
          </div>
          <p className="review-rating">{review.rating ? `평점 ${review.rating}` : "평점 미확인"}</p>
          <LinkifiedText className="review-body" text={review.body} />
        </article>
      ))}
    </div>
  );
}
