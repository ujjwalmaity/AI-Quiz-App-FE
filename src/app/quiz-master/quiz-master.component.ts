import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../api.service';
import { Session } from '../models';

@Component({
  standalone: true,
  selector: 'app-quiz-master',
  imports: [CommonModule],
  templateUrl: './quiz-master.component.html',
  styleUrls: ['./quiz-master.component.css']
})
export class QuizMasterComponent implements OnInit, OnDestroy {
  session: Session | null = null;
  qrDataUrl: string | null = null;
  joinUrl: string | null = null;
  loading = false;
  error: string | null = null;
  leaderboard: { id: string; name: string; score: number; correctCount: number }[] = [];
  private pollIntervalId: any;

  constructor(private api: ApiService) { }

  ngOnInit(): void { }

  ngOnDestroy(): void {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
    }
  }

  createSession() {
    this.loading = true;
    this.error = null;
    this.api.createSession().subscribe({
      next: (res) => {
        this.session = res.session;
        this.qrDataUrl = res.qrDataUrl;
        this.joinUrl = res.joinUrl || window.location.origin + '/join/' + res.sessionId;
        this.loading = false;
        this.startPolling();
      },
      error: (err) => {
        this.error = 'Failed to create session';
        this.loading = false;
        console.error(err);
      }
    });
  }

  private startPolling() {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
    }
    if (!this.session) return;
    this.pollIntervalId = setInterval(() => {
      if (!this.session) return;
      this.api.getSession(this.session.sessionId).subscribe({
        next: (sess) => {
          this.session = sess;
          if (sess.status === 'FINISHED') {
            this.loadLeaderboard();
          }
        },
        error: (err) => console.error(err)
      });
    }, 3000);
  }

  startQuiz() {
    if (!this.session) return;
    this.api.startQuiz(this.session.sessionId).subscribe({
      next: (sess) => {
        this.session = sess;
      },
      error: (err) => console.error(err)
    });
  }

  finishQuestion() {
    if (!this.session) return;
    this.api.nextQuestion(this.session.sessionId).subscribe({
      next: (sess) => {
        this.session = sess;
        if (sess.status === 'FINISHED') {
          this.loadLeaderboard();
        }
      },
      error: (err) => console.error(err)
    });
  }

  get currentQuestion() {
    if (!this.session) return null;
    if (this.session.currentQuestionIndex < 0) return null;
    return this.session.questions[this.session.currentQuestionIndex];
  }

  get answeredCount(): number {
    if (!this.session || !this.currentQuestion) return 0;
    return this.session.participants.filter(p =>
      p.answers.some(a => a.questionId === this.currentQuestion!.id)
    ).length;
  }

  loadLeaderboard() {
    if (!this.session) return;
    this.api.getLeaderboard(this.session.sessionId).subscribe({
      next: (data) => this.leaderboard = data,
      error: (err) => console.error(err)
    });
  }

  downloadCsv() {
    if (!this.session) return;
    const url = this.api.getLeaderboardCsvUrl(this.session.sessionId);
    window.open(url, "_blank");
  }
}
