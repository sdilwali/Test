CREATE TYPE "public"."adult_role" AS ENUM('owner', 'member');--> statement-breakpoint
CREATE TYPE "public"."alert_channel" AS ENUM('push', 'sms', 'email');--> statement-breakpoint
CREATE TYPE "public"."alert_status" AS ENUM('scheduled', 'sent', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."alert_tier" AS ENUM('T14', 'T3', 'T1', 'T1H', 'T10M', 'OPEN');--> statement-breakpoint
CREATE TYPE "public"."competition" AS ENUM('low', 'medium', 'high', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."confidence" AS ENUM('confirmed', 'extracted', 'predicted');--> statement-breakpoint
CREATE TYPE "public"."coverage_state" AS ENUM('covered', 'partial', 'gap');--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('interested', 'registered', 'waitlisted', 'declined');--> statement-breakpoint
CREATE TYPE "public"."inbox_source" AS ENUM('inbound-email', 'paste', 'screenshot-ocr');--> statement-breakpoint
CREATE TYPE "public"."intel_source" AS ENUM('email', 'user_confirmed');--> statement-breakpoint
CREATE TYPE "public"."opens_at_precision" AS ENUM('exact', 'day', 'month', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."parse_status" AS ENUM('pending', 'parsed', 'needs_review', 'confirmed', 'rejected', 'no_signal');--> statement-breakpoint
CREATE TYPE "public"."program_kind" AS ENUM('camp', 'sport', 'class', 'lesson', 'enrichment', 'other');--> statement-breakpoint
CREATE TYPE "public"."provider_kind" AS ENUM('rec_dept', 'camp', 'league', 'school', 'studio', 'other');--> statement-breakpoint
CREATE TYPE "public"."registration_method" AS ENUM('online', 'lottery', 'in_person', 'phone', 'email', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."window_status" AS ENUM('upcoming', 'open', 'closed', 'registered', 'waitlisted', 'missed', 'skipped');--> statement-breakpoint
CREATE TABLE "adult" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"role" "adult_role" DEFAULT 'member' NOT NULL,
	"push_subscription" jsonb,
	"sms_opt_in" boolean DEFAULT false NOT NULL,
	"quiet_hours_start" time,
	"quiet_hours_end" time,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_window_id" uuid NOT NULL,
	"adult_id" uuid NOT NULL,
	"fire_at" timestamp with time zone NOT NULL,
	"channel" "alert_channel" NOT NULL,
	"tier" "alert_tier" NOT NULL,
	"status" "alert_status" DEFAULT 'scheduled' NOT NULL,
	"sent_at" timestamp with time zone,
	"failure_reason" text
);
--> statement-breakpoint
CREATE TABLE "coverage_block" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"label" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrollment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kid_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"status" "enrollment_status" DEFAULT 'interested' NOT NULL,
	"cost_cents" integer,
	"confirmation_ref" text,
	"registered_at" timestamp with time zone,
	"waitlist_position" integer
);
--> statement-breakpoint
CREATE TABLE "household" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"timezone" text DEFAULT 'America/Los_Angeles' NOT NULL,
	"home_zip" text,
	"forward_address" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "household_forward_address_unique" UNIQUE("forward_address")
);
--> statement-breakpoint
CREATE TABLE "inbox_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"source" "inbox_source" DEFAULT 'inbound-email' NOT NULL,
	"from_address" text,
	"subject" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"raw_text" text,
	"raw_html" text,
	"attachments" jsonb,
	"parse_status" "parse_status" DEFAULT 'pending' NOT NULL,
	"extraction" jsonb,
	"model_version" text
);
--> statement-breakpoint
CREATE TABLE "kid" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"preferred_name" text,
	"date_of_birth" text,
	"grade_in_fall" text,
	"school_name" text,
	"shirt_size" text,
	"shoe_size" text,
	"allergies" text,
	"medications" text,
	"medical_notes" text,
	"insurance_carrier" text,
	"insurance_member_id" text,
	"doctor_name" text,
	"doctor_phone" text,
	"emergency_contact_1_name" text,
	"emergency_contact_1_phone" text,
	"emergency_contact_1_relationship" text,
	"emergency_contact_2_name" text,
	"emergency_contact_2_phone" text,
	"emergency_contact_2_relationship" text,
	"authorized_pickup" text,
	"swim_level" text,
	"photo_release" boolean,
	"sunscreen_consent" boolean,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prep_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"window_id" uuid NOT NULL,
	"label" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"household_id" uuid,
	"name" text NOT NULL,
	"session_label" text,
	"kind" "program_kind" DEFAULT 'other' NOT NULL,
	"session_start_date" date,
	"session_end_date" date,
	"daily_start_time" time,
	"daily_end_time" time,
	"location_name" text,
	"location_address" text,
	"age_min" integer,
	"age_max" integer,
	"grade_min" integer,
	"grade_max" integer,
	"cost_cents" integer,
	"cost_note" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "provider_intel" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_canonical_key" text NOT NULL,
	"program_name_normalized" text NOT NULL,
	"observed_year" integer NOT NULL,
	"observed_opens_at" timestamp with time zone NOT NULL,
	"observed_source" "intel_source" NOT NULL,
	"zip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"website" text,
	"kind" "provider_kind" DEFAULT 'other' NOT NULL,
	"city" text,
	"state" text,
	"zip" text,
	"canonical_key" text NOT NULL,
	"created_by_household_id" uuid
);
--> statement-breakpoint
CREATE TABLE "registration_window" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"opens_at" timestamp with time zone NOT NULL,
	"opens_at_precision" "opens_at_precision" DEFAULT 'exact' NOT NULL,
	"closes_at" timestamp with time zone,
	"display_timezone" text DEFAULT 'America/Los_Angeles' NOT NULL,
	"display_timezone_label" text DEFAULT 'PT' NOT NULL,
	"url" text,
	"method" "registration_method" DEFAULT 'unknown' NOT NULL,
	"is_lottery" boolean DEFAULT false NOT NULL,
	"expected_competition" "competition" DEFAULT 'unknown' NOT NULL,
	"confidence" "confidence" DEFAULT 'extracted' NOT NULL,
	"source_inbox_item_id" uuid,
	"status" "window_status" DEFAULT 'upcoming' NOT NULL,
	"high_stakes" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "window_field_requirement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"window_id" uuid NOT NULL,
	"field_key" text NOT NULL,
	"blocks_checkout" boolean DEFAULT false NOT NULL,
	"profile_note" text,
	"consequence" text,
	"action_label" text
);
--> statement-breakpoint
CREATE TABLE "window_kid" (
	"window_id" uuid NOT NULL,
	"kid_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "adult" ADD CONSTRAINT "adult_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert" ADD CONSTRAINT "alert_registration_window_id_registration_window_id_fk" FOREIGN KEY ("registration_window_id") REFERENCES "public"."registration_window"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert" ADD CONSTRAINT "alert_adult_id_adult_id_fk" FOREIGN KEY ("adult_id") REFERENCES "public"."adult"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coverage_block" ADD CONSTRAINT "coverage_block_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_kid_id_kid_id_fk" FOREIGN KEY ("kid_id") REFERENCES "public"."kid"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_program_id_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."program"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_item" ADD CONSTRAINT "inbox_item_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kid" ADD CONSTRAINT "kid_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prep_item" ADD CONSTRAINT "prep_item_window_id_registration_window_id_fk" FOREIGN KEY ("window_id") REFERENCES "public"."registration_window"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program" ADD CONSTRAINT "program_provider_id_provider_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."provider"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program" ADD CONSTRAINT "program_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider" ADD CONSTRAINT "provider_created_by_household_id_household_id_fk" FOREIGN KEY ("created_by_household_id") REFERENCES "public"."household"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_window" ADD CONSTRAINT "registration_window_program_id_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."program"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_window" ADD CONSTRAINT "registration_window_source_inbox_item_id_inbox_item_id_fk" FOREIGN KEY ("source_inbox_item_id") REFERENCES "public"."inbox_item"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "window_field_requirement" ADD CONSTRAINT "window_field_requirement_window_id_registration_window_id_fk" FOREIGN KEY ("window_id") REFERENCES "public"."registration_window"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "window_kid" ADD CONSTRAINT "window_kid_window_id_registration_window_id_fk" FOREIGN KEY ("window_id") REFERENCES "public"."registration_window"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "window_kid" ADD CONSTRAINT "window_kid_kid_id_kid_id_fk" FOREIGN KEY ("kid_id") REFERENCES "public"."kid"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "adult_household_email_idx" ON "adult" USING btree ("household_id","email");--> statement-breakpoint
CREATE INDEX "alert_fire_at_status_idx" ON "alert" USING btree ("fire_at","status");--> statement-breakpoint
CREATE UNIQUE INDEX "alert_window_adult_tier_channel_idx" ON "alert" USING btree ("registration_window_id","adult_id","tier","channel");--> statement-breakpoint
CREATE UNIQUE INDEX "enrollment_kid_program_idx" ON "enrollment" USING btree ("kid_id","program_id");--> statement-breakpoint
CREATE INDEX "inbox_item_household_idx" ON "inbox_item" USING btree ("household_id","received_at");--> statement-breakpoint
CREATE INDEX "inbox_item_parse_status_idx" ON "inbox_item" USING btree ("parse_status");--> statement-breakpoint
CREATE INDEX "kid_household_idx" ON "kid" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "prep_item_window_idx" ON "prep_item" USING btree ("window_id","position");--> statement-breakpoint
CREATE INDEX "program_provider_idx" ON "program" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "provider_intel_lookup_idx" ON "provider_intel" USING btree ("provider_canonical_key","program_name_normalized","observed_year");--> statement-breakpoint
CREATE INDEX "provider_intel_zip_idx" ON "provider_intel" USING btree ("zip");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_canonical_key_idx" ON "provider" USING btree ("canonical_key");--> statement-breakpoint
CREATE INDEX "registration_window_opens_at_status_idx" ON "registration_window" USING btree ("opens_at","status");--> statement-breakpoint
CREATE INDEX "registration_window_program_idx" ON "registration_window" USING btree ("program_id");--> statement-breakpoint
CREATE UNIQUE INDEX "window_field_requirement_idx" ON "window_field_requirement" USING btree ("window_id","field_key");--> statement-breakpoint
CREATE UNIQUE INDEX "window_kid_pk" ON "window_kid" USING btree ("window_id","kid_id");