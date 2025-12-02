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
  submitting = false;

  currentQuestionIndex = 0;

  // Timer per question
  private pollIntervalId: any;
  private lastQuestionId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService
  ) { }

  ngOnInit(): void {
    this.sessionId = this.route.snapshot.paramMap.get('sessionId')!;
    const stored = localStorage.getItem(this.localStorageKey);
    if (stored) {
      this.participant = JSON.parse(stored);
    }
    const storedQuestionIndex = localStorage.getItem(this.localStorageKeyQuestionIndex);
    if (storedQuestionIndex) {
      this.currentQuestionIndex = Number(storedQuestionIndex);
    }
    this.loadSession();
    this.startPolling();
  }

  ngOnDestroy(): void {
    if (this.pollIntervalId) clearInterval(this.pollIntervalId);
  }

  get localStorageKey() {
    return `ai-quiz-participant-${this.sessionId}`;
  }

  get localStorageKeyQuestionIndex() {
    return `ai-quiz-participant-${this.sessionId}-qIndex`;
  }

  loadSession() {
    this.api.getSession(this.sessionId).subscribe({
      next: (session) => {
        this.session = session;
        if (this.currentQuestionIndex === this.session.questions.length) {
          this.session.status = "FINISHED";
        }
        this.syncTimerWithQuestion();
      },
      error: (err) => {
        this.error = 'Session not found';
        console.error(err);
      }
    });
  }

  private startPolling() {
    this.pollIntervalId = setInterval(() => {
      this.loadSession();
    }, 3000);
  }

  join() {
    if (!this.name.trim()) {
      this.error = 'Please enter your name.';
      return;
    }
    this.loading = true;
    this.error = null;
    this.api.joinSession(this.sessionId, this.name.trim()).subscribe({
      next: (p) => {
        this.participant = p;
        localStorage.setItem(this.localStorageKey, JSON.stringify(p));
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to join session.';
        this.loading = false;
        console.error(err);
      }
    });
  }

  get currentQuestion() {
    if (!this.session) return null;
    if (this.currentQuestionIndex < 0) return null;
    return this.session.questions[this.currentQuestionIndex];
  }

  hasAnsweredCurrentQuestion(): boolean {
    if (!this.session || !this.participant || !this.currentQuestion) return false;
    return this.participant.answers.some(a => a.questionId === this.currentQuestion!.id);
  }

  canAnswer(): boolean {
    return !!(this.session &&
      this.participant &&
      this.session.status === 'IN_PROGRESS' &&
      this.currentQuestion &&
      !this.hasAnsweredCurrentQuestion());
  }

  submitAnswer(optionIndex: number) {
    if (!this.session || !this.participant || !this.canAnswer()) return;
    this.submitting = true;
    this.api.submitAnswer(this.session.sessionId, this.participant.id, optionIndex, this.currentQuestionIndex).subscribe({
      next: (res) => {
        // update local participant state
        if (this.currentQuestion) {
          this.participant!.answers.push({
            questionId: this.currentQuestion.id,
            selectedOptionIndex: optionIndex,
            isCorrect: res.isCorrect
          });
          this.participant!.score = res.score;
          localStorage.setItem(this.localStorageKey, JSON.stringify(this.participant));
        }
        this.nextQuestion();
        this.submitting = false;
      },
      error: (err) => {
        console.error(err);
        this.submitting = false;
      }
    });
  }

  private syncTimerWithQuestion() {
    if (!this.session || this.session.status !== 'IN_PROGRESS' || !this.currentQuestion) {
      return;
    }
    const qId = this.currentQuestion.id;
    if (qId !== this.lastQuestionId) {
      this.lastQuestionId = qId;
    }
  }

  nextQuestion() {
    if (!this.session) return;
    if (this.session.status === 'FINISHED') {
      return;
    }

    if (this.currentQuestionIndex < this.session.questions.length - 1) {
      this.currentQuestionIndex++;
    } else {
      this.currentQuestionIndex++;
      this.session.status = "FINISHED";
    }
    localStorage.setItem(this.localStorageKeyQuestionIndex, this.currentQuestionIndex.toString());
  }

}
