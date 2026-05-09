import { Controller, Get, Param } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CAMPAIGN_TEMPLATES, CampaignTemplate } from "./templates.data";

@ApiBearerAuth()
@ApiTags("Templates")
@Controller("templates")
export class TemplatesController {
  @Get()
  list(): CampaignTemplate[] {
    return CAMPAIGN_TEMPLATES;
  }

  @Get(":id")
  get(@Param("id") id: string): CampaignTemplate | undefined {
    return CAMPAIGN_TEMPLATES.find((template) => template.id === id);
  }
}
