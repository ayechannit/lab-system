import { PageHeader } from '../components/common/PageHeader'
import { feedback } from '../mock-data/ratings'
import '../components/common/ui.css'

export function RatingsFeedbackPage() {
  return (
    <div className="stack">
      <PageHeader
        title="Ratings & feedback"
        description="Monitor star ratings and written remarks from patients and clinics after results are delivered."
      />
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Rating</th>
              <th>Remark</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {feedback.map((f) => (
              <tr key={`${f.user}-${f.date}`}>
                <td>{f.user}</td>
                <td>{f.userRole}</td>
                <td>{f.rating} ★</td>
                <td>{f.comment}</td>
                <td>{f.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
