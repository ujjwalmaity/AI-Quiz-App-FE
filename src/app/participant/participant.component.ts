import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../api.service';
import { Participant, Session } from '../models';

@Component({
  standalone: true,
  selector: 'app-participant',
  imports: [CommonModule, FormsModule],
  templateUrl: './participant.component.html',
  styleUrls: ['./participant.component.css']
})
export class ParticipantComponent implements OnInit, OnDestroy {
  sessionId!: string;
  session: Session | null = null;
  participant: Participant | null = null;

  name = '';
  loading = false;
  error: string | null = null;

  // ✅ 5-minute total timer
  totalTimeSeconds = 300;
  remainingSeconds = this.totalTimeSeconds;
  timerIntervalId: any;

  // ✅ Store all answers locally
  selectedAnswers: Record<string, number> = {};
  hasSubmitted = false;

  private pollIntervalId: any;

  constructor(
      private route: ActivatedRoute,
      private api: ApiService
  ) {}

  ngOnInit(): void {
    this.sessionId = this.route.snapshot.paramMap.get('sessionId')!;

    const stored = localStorage.getItem(this.localStorageKey);
    if (stored) {
      this.participant = JSON.parse(stored);
    }

    this.loadSession();
    this.startPolling();
  }

  ngOnDestroy(): void {
    if (this.timerIntervalId) clearInterval(this.timerIntervalId);
    if (this.pollIntervalId) clearInterval(this.pollIntervalId);
  }

  get localStorageKey() {
    return `ai-quiz-participant-${this.sessionId}`;
  }

  // ✅ Poll session state
  private startPolling() {
    this.pollIntervalId = setInterval(() => {
      this.loadSession();
    }, 3000);
  }

  loadSession() {
    this.api.getSession(this.sessionId).subscribe({
      next: (session) => {
        this.session = session;
        this.syncTimerWithQuizState();
      },
      error: () => {
        this.error = 'Session not found';
      }
    });
  }

  // ✅ Join quiz
  join() {
    if (!this.name.trim()) {
      this.error = 'Please enter your name';
      return;
    }

    this.loading = true;
    this.api.joinSession(this.sessionId, this.name.trim()).subscribe({
      next: (p) => {
        this.participant = p;
        localStorage.setItem(this.localStorageKey, JSON.stringify(p));
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to join session';
        this.loading = false;
      }
    });
  }

  // ✅ Start the 5-minute timer once quiz starts
  private syncTimerWithQuizState() {
    if (
        this.session?.status === 'IN_PROGRESS' &&
        !this.timerIntervalId &&
        !this.hasSubmitted
    ) {
      this.startTotalTimer();
    }

    if (this.session?.status === 'FINISHED') {
      this.hasSubmitted = true;
      if (this.timerIntervalId) clearInterval(this.timerIntervalId);
    }
  }

  private startTotalTimer() {
    this.remainingSeconds = this.totalTimeSeconds;

    this.timerIntervalId = setInterval(() => {
      this.remainingSeconds--;

      if (this.remainingSeconds <= 0) {
        this.remainingSeconds = 0;
        this.submitQuiz(); // ✅ Auto submit
      }
    }, 1000);
  }

  get progressPercent(): number {
    return (this.remainingSeconds / this.totalTimeSeconds) * 100;
  }

  // ✅ Select answer
  selectAnswer(questionId: string, optionIndex: number) {
    if (this.hasSubmitted) return;
    this.selectedAnswers[questionId] = optionIndex;
  }

  // ✅ Submit ALL answers at once
  submitQuiz() {
    if (!this.session || !this.participant || this.hasSubmitted) return;

    this.hasSubmitted = true;
    clearInterval(this.timerIntervalId);

    const answerPayload = Object.entries(this.selectedAnswers).map(
        ([questionId, selectedOptionIndex]) => ({
          questionId,
          selectedOptionIndex
        })
    );

    this.api.submitAllAnswers(
        this.session.sessionId,
        this.participant.id,
        answerPayload
    ).subscribe({
      next: (res) => {
        this.participant!.score = res.score;
        localStorage.setItem(this.localStorageKey, JSON.stringify(this.participant));
      }
    });
  }
}
