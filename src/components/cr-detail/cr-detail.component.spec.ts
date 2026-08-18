import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrDetailComponent } from './cr-detail.component';
import { CrApiService } from '../../api/cr-api.service';
import { SessionService } from '../../session/session.service';
import { users } from '../../api/fixtures';
import { ReqUser } from '../../models/cr.models';
import { Component } from '@angular/core';

const flush = () => new Promise((r) => setTimeout(r, 0));

async function render(user: ReqUser, id: string, setup?: (api: CrApiService) => void): Promise<ComponentFixture<CrDetailComponent>> {
	TestBed.configureTestingModule({
		imports: [CrDetailComponent],
		providers: [{ provide: SessionService, useValue: { user } }],
	});
	await TestBed.compileComponents();
	setup?.(TestBed.inject(CrApiService));
	const fixture = TestBed.createComponent(CrDetailComponent);
	fixture.componentInstance.id = id;
	fixture.detectChanges(); // ngOnInit -> load()
	await flush(); // let the mock API resolve
	fixture.detectChanges(); // render the loaded state
	return fixture;
}

const el = (fixture: ComponentFixture<CrDetailComponent>, selector: string) => fixture.nativeElement.querySelector(selector);

function setReason(fixture: ComponentFixture<CrDetailComponent>, value: string): void {
	const reason: HTMLTextAreaElement = el(fixture, '.cr-actions__reason');
	reason.value = value;
	reason.dispatchEvent(new Event('input'));
	fixture.detectChanges();
}

function timelineActions(fixture: ComponentFixture<CrDetailComponent>): string[] {
	const nodes: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.cr-timeline__action');
	return Array.from(nodes).map((node) => (node.textContent ?? '').trim());
}

/** Host with a real [id] binding — direct field assignment never triggers ngOnChanges. */
@Component({
	standalone: true,
	imports: [CrDetailComponent],
	template: '<app-cr-detail [id]="id"></app-cr-detail>',
})
class DetailHostComponent {
	id = 'CR-1';
}


describe('CrDetailComponent', () => {
	it('loads and renders the change request title', async () => {
		const fixture = await render(users.approver, 'CR-1');
		expect(fixture.nativeElement.querySelector('.cr-detail__header h2').textContent).toContain('Add 1 unit of SKU-A');
	});

	it('disables Approve for a read-only viewer on a pending CR', async () => {
		const fixture = await render(users.viewer, 'CR-1'); // viewer: cr_r_o only; CR-1 is PENDING_APPROVAL
		const approveBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__approve');
		expect(approveBtn.disabled).toBe(true);
	});

	it('renders the timeline oldest first', async () => {
		const fixture = await render(users.approver, 'CR-1'); // fixture order is newest first
		expect(timelineActions(fixture)).toEqual(['CREATE', 'SUBMIT', 'SEND_FOR_APPROVAL']);
	});

	it('shows the changed description in the diff panel', async () => {
		const fixture = await render(users.approver, 'CR-2'); // description-only change
		const row = el(fixture, '.cr-diff__row[data-kind="changed"]');
		expect(row.textContent).toContain('Widget B (new supplier)');
	});

	it('enables Approve for a permitted user on a pending CR', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const approve: HTMLButtonElement = el(fixture, '.cr-actions__approve');
		expect(approve.disabled).toBe(false);
	});

	it('disables Approve on a CR that is not pending, even for a permitted user', async () => {
		const fixture = await render(users.approver, 'CR-2'); // APPLIED
		const approve: HTMLButtonElement = el(fixture, '.cr-actions__approve');
		expect(approve.disabled).toBe(true);
	});

	it('disables Reject and the reason box for a read-only viewer', async () => {
		const fixture = await render(users.viewer, 'CR-1');
		const reject: HTMLButtonElement = el(fixture, '.cr-actions__reject-btn');
		const reason: HTMLTextAreaElement = el(fixture, '.cr-actions__reason');
		expect(reject.disabled).toBe(true);
		expect(reason.disabled).toBe(true);
	});

	it('renders the error state when the CR belongs to another org', async () => {
		const fixture = await render(users.otherOrg, 'CR-1');
		expect(el(fixture, '.cr-detail__error')).not.toBeNull();
		expect(el(fixture, '.cr-detail__header')).toBeNull();
	});

	it('keeps Reject disabled until a non-blank reason is entered', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const reject: HTMLButtonElement = el(fixture, '.cr-actions__reject-btn');
		expect(reject.disabled).toBe(true);

		setReason(fixture, '   ');
		expect(reject.disabled).toBe(true);

		setReason(fixture, 'Budget not approved');
		expect(reject.disabled).toBe(false);
	});

	it('does not call the API when Reject runs without a reason', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const spy = jest.spyOn(TestBed.inject(CrApiService), 'reject');
		await fixture.componentInstance.reject();
		fixture.detectChanges();
		expect(spy).not.toHaveBeenCalled();
		expect(el(fixture, '.cr-actions__reason-error')).not.toBeNull();
	});

	it('approves and reflects the new status without a refetch', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const approve: HTMLButtonElement = el(fixture, '.cr-actions__approve');
		approve.click();
		await flush();
		fixture.detectChanges();

		expect(el(fixture, '.cr-status').textContent).toContain('APPROVED');
		expect(timelineActions(fixture).pop()).toBe('APPROVE');
		expect((el(fixture, '.cr-actions__approve') as HTMLButtonElement).disabled).toBe(true);
	});

	it('rejects with a reason and records it on the timeline', async () => {
		const fixture = await render(users.approver, 'CR-1');
		setReason(fixture, 'Budget not approved');
		(el(fixture, '.cr-actions__reject-btn') as HTMLButtonElement).click();
		await flush();
		fixture.detectChanges();

		expect(el(fixture, '.cr-status').textContent).toContain('REJECTED');
		expect(el(fixture, '.cr-timeline__note').textContent).toContain('Budget not approved');
	});

	it('shows an action error and keeps the loaded CR when approve fails', async () => {
		const fixture = await render(users.approver, 'CR-1');
		TestBed.inject(CrApiService).failNext = true;
		(el(fixture, '.cr-actions__approve') as HTMLButtonElement).click();
		await flush();
		fixture.detectChanges();

		expect(el(fixture, '.cr-actions__error').textContent).toContain('Network error');
		expect(el(fixture, '.cr-status').textContent).toContain('PENDING_APPROVAL');
		expect(el(fixture, '.cr-detail__header')).not.toBeNull();
	});

	it('shows the in-flight state and ignores a second action while one is running', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const api = TestBed.inject(CrApiService);
		api.latencyMs = 20; // set after the initial load so only the action is slow
		const spy = jest.spyOn(api, 'approve');

		const first = fixture.componentInstance.approve();
		const second = fixture.componentInstance.approve(); // second click on a slow network
		fixture.detectChanges();
		expect(el(fixture, '.cr-actions__pending')).not.toBeNull();

		await Promise.all([first, second]);
		fixture.detectChanges();

		expect(spy).toHaveBeenCalledTimes(1);
		expect(el(fixture, '.cr-actions__pending')).toBeNull();
	});

	it('reloads when the selected CR changes', async () => {
		TestBed.configureTestingModule({
			imports: [DetailHostComponent],
			providers: [{ provide: SessionService, useValue: { user: users.approver } }],
		});
		await TestBed.compileComponents();
		const fixture = TestBed.createComponent(DetailHostComponent);
		fixture.detectChanges();
		await flush();
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('.cr-detail__header h2').textContent).toContain('Add 1 unit of SKU-A');

		fixture.componentInstance.id = 'CR-2';
		fixture.detectChanges();
		await flush();
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('.cr-detail__header h2').textContent).toContain('Replace SKU-B supplier');
	});
});
